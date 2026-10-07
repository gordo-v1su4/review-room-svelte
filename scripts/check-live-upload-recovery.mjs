import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
const base='https://review.v1su4.dev', statePath='.scratch/release-readiness/upload-recovery-state.json.local';
const admin=new ConvexHttpClient('https://review-convex.v1su4.dev');admin.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
let cookie;
async function post(path,body) {return fetch(base+path,{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify(body),redirect:'manual'});}
async function begin(state,name,type,bytes,folderId,assetId) {const r=await post('/api/uploads/begin',{projectId:state.projectId,name,type,size:bytes.length,folderId,assetId});assert.equal(r.status,200,'Owner upload begin failed');return r.json();}
async function put(ticket,bytes,type) {const r=await fetch(ticket.url,{method:'PUT',headers:{'content-type':type},body:bytes});assert(r.ok,'Original PUT failed');}
async function preview(ticket,bytes) {const r=await fetch(ticket.posterUrl,{method:'PUT',headers:{'content-type':'image/jpeg'},body:bytes});assert(r.ok,'Preview PUT failed');}
async function finish(ticket,type,poster) {return post('/api/uploads/complete',{sessionId:ticket.sessionId,posterSizeBytes:poster.length,durationSec:type.startsWith('video/')?2.5:0,width:type.startsWith('video/')?1280:320,height:type.startsWith('video/')?720:180});}
async function ready(assetId) {for(let i=0;i<90;i++){const s=await admin.query('personal:snapshot',{}),a=s.assets.find(a=>a._id===assetId);if(a?.processingStatus==='ready')return {s,a};await new Promise(r=>setTimeout(r,2000));}throw new Error('Live worker readiness timed out');}
try {
  const login=await fetch(base+'/studio/sign-in?/email',{method:'POST',redirect:'manual',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'gordo@v1su4.com',password:process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD})});cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie,'Owner session unavailable');
  let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{};
  if(!state.projectId){state.projectId=await admin.mutation('personal:createProject',{title:'Upload recovery QA 2026-10-07',description:'Agent-created synthetic upload failure fixtures only.'});writeFileSync(statePath,JSON.stringify(state));}
  let snapshot=await admin.query('personal:snapshot',{});assert(snapshot.projects.find(p=>p._id===state.projectId)?.description?.startsWith('Agent-created synthetic'),'QA scope mismatch');
  const poster=readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg'), type='image/jpeg';
  if(process.argv.includes('--expiry-only')) {
    const ticket=await begin(state,'expired-authorization-qa.jpg',type,poster);
    await put(ticket,poster,type);
    const parsed=new URL(ticket.url),signatureDate=parsed.searchParams.get('X-Amz-Date');
    const started=Date.UTC(Number(signatureDate.slice(0,4)),Number(signatureDate.slice(4,6))-1,Number(signatureDate.slice(6,8)),Number(signatureDate.slice(9,11)),Number(signatureDate.slice(11,13)),Number(signatureDate.slice(13,15)));
    const expiresAt=started+Number(parsed.searchParams.get('X-Amz-Expires'))*1000;
    console.log(JSON.stringify({expiryProbeStarted:true,realAuthorizationSeconds:Number(parsed.searchParams.get('X-Amz-Expires'))}));
    while(Date.now()<expiresAt+1500)await new Promise(r=>setTimeout(r,Math.min(30000,expiresAt+1500-Date.now())));
    const denied=await fetch(ticket.url,{method:'PUT',headers:{'content-type':type},body:poster});assert.equal(denied.status,403,'Actually expired storage authorization remained usable');
    const renewed=await post('/api/uploads/renew',{sessionId:ticket.sessionId});assert.equal(renewed.status,200,'Expired authorization renewal failed');const fresh=await renewed.json();assert.equal(fresh.sessionId,ticket.sessionId,'Renewal changed upload session');
    await put(fresh,poster,type);await preview(fresh,poster);const completed=await finish(fresh,type,poster);assert.equal(completed.status,200,'Renewed session completion failed');
    const result={releaseVersion:await(await fetch(base+'/_app/version.json')).json(),actuallyExpiredPut:403,renewedSameSession:true,assetId:(await completed.json()).assetId};writeFileSync('docs/verification/evidence/upload-expiry-live-20261007.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  } else {
    const bytes=readFileSync('.scratch/release-readiness/large-upload-qa.mp4');assert(bytes.length>50*1024**2&&bytes.length<=90*1024**2,'Large synthetic video outside supported size');
    const large=await begin(state,'large-61MB-h264-qa.mp4','video/mp4',bytes);await put(large,bytes,'video/mp4');await preview(large,poster);const largeDone=await finish(large,'video/mp4',poster);assert.equal(largeDone.status,200,'Large video completion failed');const largeResult=await largeDone.json();
    const replay=await finish(large,'video/mp4',poster);assert.equal(replay.status,200);const replayResult=await replay.json();assert.equal(replayResult.assetId,largeResult.assetId,'Completion duplicated asset');assert.equal(replayResult.jobId,largeResult.jobId,'Completion duplicated worker job');
    const parent=await admin.mutation('personal:createFolder',{projectId:state.projectId,title:'Captured upload parent'}),child=await admin.mutation('personal:createFolder',{projectId:state.projectId,title:'Nested destination',parentFolderId:parent});
    const interrupted=await begin(state,'interrupted-qa.jpg',type,poster,child);const abort=new AbortController();
    const stream=new ReadableStream({start(controller){controller.enqueue(poster.subarray(0,64));}});const timer=setTimeout(()=>abort.abort(),200);
    try{await fetch(interrupted.url,{method:'PUT',headers:{'content-type':type,'content-length':String(poster.length)},body:stream,duplex:'half',signal:abort.signal});}catch{}finally{clearTimeout(timer);}
    const partial=await finish(interrupted,type,poster);assert.equal(partial.status,409,'Interrupted original was finalized');
    let removalDenied=false;try{await admin.mutation('personal:removeFolder',{folderId:child,assetDisposition:'move_to_root'});}catch{removalDenied=true;}assert(removalDenied,'In-flight destination removal was allowed');
    const movedParent=await admin.mutation('personal:createFolder',{projectId:state.projectId,title:'Moved destination parent'});await admin.mutation('personal:moveFolder',{folderId:child,parentFolderId:movedParent});
    await put(interrupted,poster,type);await preview(interrupted,poster);const recovered=await finish(interrupted,type,poster);assert.equal(recovered.status,200,'Interrupted upload retry failed');const imageResult=await recovered.json();
    const imageReplay=await finish(interrupted,type,poster);assert.equal((await imageReplay.json()).assetId,imageResult.assetId,'Image retry duplicated identity');
    const {s,a}=await ready(largeResult.assetId);snapshot=s;
    assert.equal(a.sizeBytes,bytes.length,'Large video persisted byte length differs');assert.equal(snapshot.versions.filter(v=>v.assetId===largeResult.assetId).length,1,'Large video duplicate version');assert.equal(snapshot.mediaJobs.filter(j=>j.assetId===largeResult.assetId).length,1,'Large video duplicate job');
    const image=snapshot.assets.find(a=>a._id===imageResult.assetId);assert.equal(image.folderId,child,'Moved folder changed captured destination');assert.equal(image.assetClass,'IMG');assert.equal(image.processingStatus,'ready');assert.equal(snapshot.versions.filter(v=>v.assetId===image._id).length,1,'Interrupted retry duplicated version');
    assert.equal(snapshot.publications.filter(p=>[a._id,image._id].includes(p.assetId)).length,0,'Upload automatically published media');
    const sync=await admin.query('destinationSync:snapshot',{projectId:state.projectId});assert.equal(sync.connections.length,0,'Upload automatically connected destination');
    state.largeId=a._id;state.imageId=image._id;writeFileSync(statePath,JSON.stringify(state));
    const summary={releaseVersion:await(await fetch(base+'/_app/version.json')).json(),projectId:state.projectId,largeBytes:bytes.length,largeCodec:'H.264 Constrained Baseline / yuv420p',transport:'direct PUT; no multipart path',largeReady:true,stableCompletionReplay:true,interruptedCompletion:409,retrySameSession:true,destinationRemovalDenied:true,movedCapturedFolderPreserved:true,imageStillOnly:true,automaticPublication:false,automaticSync:false,partialBatchUi:false,cancelUi:false,openWorkspaceRecovery:false};writeFileSync('docs/verification/evidence/upload-recovery-live-20261007.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
  }
}catch(cause){console.error(cause instanceof Error?cause.message.replace(/https?:\/\/\S+/g,'[private URL]'):'Upload recovery acceptance failed');process.exitCode=1;}
