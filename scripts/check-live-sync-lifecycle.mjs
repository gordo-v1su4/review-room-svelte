import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
const base='https://review.v1su4.dev',target='https://media.v1su4.dev/trailer-feed';
const path='.scratch/release-readiness/lifecycle-state.json.local';
const state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
const persist=()=>writeFileSync(path,JSON.stringify(state,null,2));
const c=new ConvexHttpClient('https://review-convex.v1su4.dev');c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const auth=await fetch(base+'/studio/sign-in?/email',{method:'POST',redirect:'manual',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'gordo@v1su4.com',password:process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD})});
const cookie=auth.headers.get('set-cookie')?.split(';')[0];assert(cookie,'Owner unavailable');
const owner=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok,`Owner ${route} failed (${r.status})`);return r.json();};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snap=()=>c.query('personal:snapshot',{});
const scope=()=>c.query('destinationSync:snapshot',{projectId:state.projectId});
const catalog=async()=>{const r=await fetch(`${target}/data/comparisons/${state.runId}/artifacts.json`);assert(r.ok,'Synthetic lifecycle target missing');return r.json();};
const canonical=s=>{const assets=s.assets.filter(a=>a.projectId==='ks70059gkp2ndsw6gy8a2sr5758fqfgk');const ids=new Set(assets.map(a=>a._id));return hash({assets,versions:s.versions.filter(v=>ids.has(v.assetId))});};
const summary=(step,values)=>{assert.equal(canonical(awaitableSnapshot),state.canonicalHash,'Canonical source changed');writeFileSync(`.scratch/release-readiness/lifecycle-${step}-summary.json`,JSON.stringify(values,null,2));console.log(JSON.stringify(values));};
let awaitableSnapshot=await snap();
state.canonicalHash??=canonical(awaitableSnapshot);persist();
async function wait(check,limit=80){for(let i=0;i<limit;i++){if(await check())return;await new Promise(r=>setTimeout(r,1000));}throw Error('Lifecycle wait exceeded');}
async function upload(name,file,type){
  const bytes=readFileSync('.scratch/review-trailer-sync/live-qa/'+file),poster=readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
  const ticket=await owner('/api/uploads/begin',{projectId:state.projectId,name,type,size:bytes.length});
  for(const[url,data,mime]of[[ticket.url,bytes,type],[ticket.posterUrl,poster,'image/jpeg']]){if(!url)continue;const r=await fetch(url,{method:'PUT',headers:{'content-type':mime},body:data});assert(r.ok,'Fixture PUT failed');}
  const completed=await owner('/api/uploads/complete',{sessionId:ticket.sessionId,posterSizeBytes:poster.length,durationSec:type.startsWith('video')?2:0,width:320,height:180});
  await wait(async()=>{const s=await snap();const a=s.assets.find(a=>a._id===completed.assetId);return s.versions.some(v=>v._id===a?.currentVersionId&&v.processingState==='ready');});
  const s=await snap(),asset=s.assets.find(a=>a._id===completed.assetId);return {assetId:asset._id,versionId:asset.currentVersionId};
}
const mode=process.argv[2];
if(mode==='prepare'){
  if(!state.projectId){state.projectId=await c.mutation('personal:createProject',{title:'Lifecycle QA 2026-10-07'});persist();}
  assert((await snap()).projects.find(p=>p._id===state.projectId)?.title==='Lifecycle QA 2026-10-07','Fixture project guard');
  if(!state.video){state.video=await upload('lifecycle.mp4','synthetic-v1.mp4','video/mp4');persist();}
  if(!state.image){state.image=await upload('lifecycle-grid.jpg','poster.jpg','image/jpeg');persist();}
  if(!state.runId){const r=await owner('/api/owner-sync',{action:'connect',projectId:state.projectId,mode:'create',targetTitle:'Lifecycle QA 2026-10-07'});state.connectionId=r.connectionId;state.runId=r.targetRunId;persist();}
  let s=await snap(),v=s.versions.find(v=>v._id===state.video.versionId);
  if(!v.creativeMetadata?.gridImageVersionId){await c.mutation('personal:updateVersionMetadata',{versionId:v._id,expectedUpdatedAt:v.metadataUpdatedAt??null,metadata:{sourceLabel:'Synthetic lifecycle',model:'QA',prompt:'Preserve source',gridImageVersionId:state.image.versionId,referenceImageVersionIds:[]}});}
  const w=await c.query('destinationSync:workspace',{projectId:state.projectId});
  const versions=w.versions.filter(v=>v.versionId===state.video.versionId).map(v=>({versionId:v.versionId,expectedMetadataUpdatedAt:v.expectedMetadataUpdatedAt}));
  if(!state.batchId){const r=await owner('/api/owner-sync',{action:'confirm',connectionId:state.connectionId,confirmationId:randomUUID(),versions});state.batchId=r.batchId;persist();}
  await wait(async()=> (await scope()).items.some(j=>j.versionId===state.video.versionId&&j.state==='synced'));
  const artifacts=await catalog();state.root=artifacts.find(a=>a.source_version_id===state.video.versionId);state.imageUrl=state.root.shot_grid_url;
  s=await snap();state.sourceHash=hash({asset:s.assets.find(a=>a._id===state.video.assetId),version:s.versions.find(v=>v._id===state.video.versionId),comments:s.comments.filter(x=>x.videoId===state.video.assetId)});persist();
  awaitableSnapshot=s;summary('prepared',{prepared:true,rootAndImageRegistered:artifacts.length===2});
}else if(mode==='unsync'){
  const job=(await scope()).items.find(j=>j.versionId===state.video.versionId&&j.state==='synced');assert(job,'Published synthetic job missing');
  const r=await owner('/api/owner-sync',{action:'unsync',jobId:job.id,expectedGeneration:job.consentGeneration});state.unsyncId=r.unsyncId;state.oldGeneration=job.consentGeneration;persist();
  assert.equal((await fetch(state.root.media_url,{headers:{'if-none-match':'*'}})).status,404);assert.equal((await fetch(state.imageUrl)).status,404);
  const jobAfter=(await scope()).items.find(j=>j.id===job.id);assert(!jobAfter.canSyncAgain,'Unsync pending permits new publication');
  awaitableSnapshot=await snap();summary('unsync-saved',{rootDeniedImmediately:true,imageDeniedImmediately:true,unsyncDurable:true,canonicalUnchanged:true});
}else if(mode==='unsync-complete'){
  await wait(async()=> (await c.query('destinationUnsync:snapshot',{projectId:state.projectId})).find(x=>x.id===state.unsyncId)?.state==='complete');
  assert.equal((await catalog()).length,0);
  const s=await snap();assert.equal(hash({asset:s.assets.find(a=>a._id===state.video.assetId),version:s.versions.find(v=>v._id===state.video.versionId),comments:s.comments.filter(x=>x.videoId===state.video.assetId)}),state.sourceHash,'Unsync changed source or feedback');
  awaitableSnapshot=s;summary('unsync-complete',{suppressionConfirmed:true,sourceAndFeedbackRetained:true,canonicalUnchanged:true});
}else if(mode==='sync-again'){
  await c.action('destinationDelivery:reconcile',{projectId:state.projectId});
  const job=(await scope()).items.find(j=>j.versionId===state.video.versionId&&j.canSyncAgain);assert(job,'Verified fresh reactivation missing');
  const version=(await c.query('destinationSync:workspace',{projectId:state.projectId})).versions.find(v=>v.versionId===state.video.versionId);
  await owner('/api/owner-sync',{action:'sync-again',connectionId:state.connectionId,confirmationId:randomUUID(),versionId:state.video.versionId,expectedGeneration:job.consentGeneration,expectedMetadataUpdatedAt:version.expectedMetadataUpdatedAt});
  await wait(async()=> (await scope()).items.some(j=>j.versionId===state.video.versionId&&j.state==='synced'&&j.consentGeneration>state.oldGeneration));
  const artifacts=await catalog(),root=artifacts.find(a=>a.source_version_id===state.video.versionId);assert.equal(root.artifact_id,state.root.artifact_id);assert.equal(root.version_number,state.root.version_number);assert.equal((await fetch(state.root.media_url)).status,404);state.root=root;state.imageUrl=root.shot_grid_url;persist();
  awaitableSnapshot=await snap();summary('reactivated',{freshConsent:true,sameArtifactAndNumber:true,oldGrantDenied:true,canonicalUnchanged:true});
}else if(mode==='delete-image'||mode==='delete-video'){
  const asset=mode==='delete-image'?state.image:state.video;const s=await snap();assert(s.assets.some(a=>a._id===asset.assetId&&a.projectId===state.projectId),'Delete outside synthetic fixture');
  await owner('/api/owner-assets/delete',{projectId:state.projectId,assetIds:[asset.assetId]});
  assert.equal((await fetch(mode==='delete-image'?state.imageUrl:state.root.media_url)).status,404);
  state.deletedVersion=asset.versionId;persist();awaitableSnapshot=await snap();summary(mode,{sourceRemoved:true,capabilityDeniedImmediately:true,canonicalUnchanged:true});
}else if(mode==='deletion-complete'){
  await wait(async()=> (await scope()).removals.some(x=>x.versionId===state.deletedVersion&&x.state==='complete'));
  const artifacts=await catalog();const imageDeleted=state.deletedVersion===state.image.versionId;
  assert.equal(artifacts.length,imageDeleted?1:0);
  if(imageDeleted){assert.equal(artifacts[0].artifact_id,state.root.artifact_id);assert.equal(artifacts[0].media_url,state.root.media_url);assert(!artifacts[0].shot_grid_url);assert((await fetch(state.root.media_url)).ok);}
  awaitableSnapshot=await snap();summary('deletion-complete',{imageOnly:imageDeleted,targetRemovedExactly:true,survivingRootStable:imageDeleted,canonicalUnchanged:true});
}else throw Error('Choose explicit lifecycle step');
