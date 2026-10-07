import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';

// Owner HTTP / token HTTP / anonymous Convex are the approved observable seams.
// Only a dedicated synthetic project is mutated. Capabilities never reach output.
const base = 'https://review.v1su4.dev';
const admin = new ConvexHttpClient('https://review-convex.v1su4.dev');
admin.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const guest = () => new ConvexHttpClient('https://review-convex.v1su4.dev');
const statePath = '.scratch/release-readiness/private-review-state.json.local';
const grants = [], results = {};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let ownerCookie;
const owner = async (path, body) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: { cookie: ownerCookie, origin: base, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  assert(response.ok, `Owner HTTP operation failed (${response.status})`);
  return response.json();
};
async function upload(projectId, name, type, file) {
  const bytes = readFileSync(file), poster = readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
  const ticket = await owner('/api/uploads/begin', { projectId, name, type, size: bytes.length });
  for (const [url, data, contentType] of [[ticket.url, bytes, type], [ticket.posterUrl, poster, 'image/jpeg']]) {
    if (!url) continue;
    const response = await fetch(url, { method: 'PUT', headers: { 'content-type': contentType }, body: data });
    assert(response.ok, 'Synthetic upload storage transfer failed');
  }
  const result = await owner('/api/uploads/complete', { sessionId: ticket.sessionId, posterSizeBytes: poster.length, durationSec: type.startsWith('video') ? 1 : 0, width: 320, height: 180 });
  return result.assetId;
}
async function link(projectId, options = {}) {
  const result = await admin.mutation('personal:createReviewLink', { projectId, ...options });
  grants.push(result); return result;
}
async function unlock(grant, passcode, client = guest()) {
  const session = await client.mutation('reviewLinks:verifyPasscode', { token: grant.token, passcode });
  assert(session.ok && session.accessKey, 'QA reviewer unlock failed');
  return { client, token: grant.token, accessKey: session.accessKey, cookie: `rr_review_${grant.token.slice(0,24)}=${session.accessKey}` };
}
async function request(session, path, options = {}) {
  return fetch(base + path, { redirect: 'manual', ...options, headers: { origin: base, ...(session?.cookie ? { cookie: session.cookie } : {}), ...options.headers } });
}
const mediaPath = (grant, assetId) => `/api/review-media/${grant.token}/${assetId}`;
const downloadPath = (grant, asset) => `/api/review-download/${grant.token}/${asset._id}/${asset.currentVersionId}`;
async function mutate(session, action, assetId, values = {}) {
  const response = await request(session, `/api/private-review/${session.token}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action,assetId,...values}) });
  assert.equal(response.status,200,`Reviewer ${action} HTTP mutation failed`);
}
async function denied(grant, session, asset, label) {
  const client = session?.client ?? guest();
  const scope = { token: grant.token, ...(session?.accessKey ? { accessKey: session.accessKey } : {}) };
  for (const [method, fn, args] of [
    ['query','reviewPublic:getProjectByToken',scope],
    ['query','reviewPublic:listVideosByToken',scope],
    ['query','reviewPublic:listCommentsByVideo',{...scope,videoId:asset._id}],
    ['mutation','reviewPublic:clientSetRating',{...scope,videoId:asset._id,rating:1}]
  ]) {
    let failed = false;
    try { await client[method](fn,args); } catch { failed = true; }
    assert(failed,`${label}: direct ${fn} bypass succeeded`);
  }
  for (const [path, options] of [[mediaPath(grant,asset._id),{}],[mediaPath(grant,asset._id),{headers:{range:'bytes=0-31'}}],[mediaPath(grant,asset._id),{headers:{'if-none-match':'*'}}],[downloadPath(grant,asset),{}]]) {
    const r = await request(session,path,options); assert.equal(r.status,404,`${label}: private media denial failed`); await r.arrayBuffer();
  }
  const mutation = await request(session,`/api/private-review/${grant.token}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'rating',assetId:asset._id,rating:1})});
  assert.equal(mutation.status,404,`${label}: HTTP mutation bypass succeeded`);
  results[label] = true;
}
try {
  mkdirSync('.scratch/release-readiness', { recursive: true });
  const login = await fetch(base + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
  ownerCookie = login.headers.get('set-cookie')?.split(';')[0]; assert(ownerCookie,'Owner session unavailable');
  let state = existsSync(statePath) ? JSON.parse(readFileSync(statePath,'utf8')) : {};
  let snapshot = await admin.query('personal:snapshot', {});
  if (!state.projectId) {
    state.projectId = await admin.mutation('personal:createProject',{title:'Private client acceptance QA 2026-10-07',description:'Agent-created synthetic persistence/access fixtures only.'});
    writeFileSync(statePath,JSON.stringify(state));
  }
  assert(snapshot.projects.some(p=>p._id===state.projectId && p.description?.startsWith('Agent-created synthetic')) || !snapshot.projects.some(p=>p._id===state.projectId),'QA scope mismatch');
  if (!state.videoId) { state.videoId=await upload(state.projectId,'private-review-qa.mp4','video/mp4','.scratch/review-trailer-sync/live-qa/synthetic-v1.mp4');writeFileSync(statePath,JSON.stringify(state)); }
  if (!state.imageId) { state.imageId=await upload(state.projectId,'private-review-qa.jpg','image/jpeg','.scratch/review-trailer-sync/live-qa/poster.jpg');writeFileSync(statePath,JSON.stringify(state)); }
  for(let i=0;i<75;i++) {
    snapshot=await admin.query('personal:snapshot',{});
    if ([state.videoId,state.imageId].every(id=>snapshot.assets.find(a=>a._id===id)?.processingStatus==='ready')) break;
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  const video=snapshot.assets.find(a=>a._id===state.videoId), image=snapshot.assets.find(a=>a._id===state.imageId);
  assert(video?.processingStatus==='ready' && image?.processingStatus==='ready','QA processing did not complete');
  if(process.argv.includes('--prepare')) { console.log(JSON.stringify({qaPrepared:true,projectId:state.projectId,videoId:state.videoId,imageId:state.imageId})); }
  else {
    for(const asset of [video,image]) await admin.mutation('personal:setAssetDownload',{assetId:asset._id,enabled:true});
    const secret=randomBytes(12).toString('hex'), grant=await link(state.projectId,{passcode:secret,canDownload:true});
    const a=await unlock(grant,secret), b=await unlock(grant,secret);
    for(const [session,name] of [[a,'QA Reviewer Alpha'],[b,'QA Reviewer Beta']]) await session.client.mutation('reviewPublic:setReviewerName',{token:grant.token,accessKey:session.accessKey,displayName:name});
    await mutate(a,'viewed',video._id); await mutate(a,'rating',video._id,{rating:4});
    // Set desired shortlist once; toggling on rerun would obscure persisted behavior.
    const list=await a.client.query('reviewPublic:listVideosByToken',{token:grant.token,accessKey:a.accessKey});
    if(!list.find(item=>item.id===video._id).isSelect) await mutate(a,'shortlist',video._id);
    await mutate(a,'status',video._id,{status:'needs_changes'});
    const suffix=randomBytes(6).toString('hex');
    const first={body:`Alpha timecoded QA ${suffix}`,requestId:`alpha-${suffix}`,timecodeSec:0.5};
    await mutate(a,'comment',video._id,first);await mutate(a,'comment',video._id,first);
    await mutate(b,'comment',video._id,{body:`Beta QA ${suffix}`,requestId:`beta-${suffix}`});
    const strokes=[{id:'qa-rect',tool:'rect',color:'#ef4444',width:3,points:[{x:0.1,y:0.1},{x:0.8,y:0.8}]}];
    await mutate(b,'viewed',image._id);await mutate(b,'annotations',image._id,{strokes});
    const reload=guest();
    const values=await reload.query('reviewPublic:listVideosByToken',{token:grant.token,accessKey:a.accessKey});
    const persisted=values.find(item=>item.id===video._id), still=values.find(item=>item.id===image._id);
    assert(persisted.viewed&&persisted.rating===4&&persisted.isSelect&&persisted.status==='needs_changes','Reviewer reload lost feedback');
    assert.deepEqual(still.annotationStrokes,strokes,'Reviewer reload lost still markup');
    const notes=await b.client.query('reviewPublic:listCommentsByVideo',{token:grant.token,accessKey:b.accessKey,videoId:video._id});
    assert.equal(notes.filter(n=>n.body===first.body).length,1,'Retry duplicated comments');
    assert(notes.some(n=>n.body===first.body&&n.authorName==='QA Reviewer Alpha'&&n.timecodeSec===0.5),'Alpha attribution/timecode lost');
    assert(notes.some(n=>n.body===`Beta QA ${suffix}`&&n.authorName==='QA Reviewer Beta'),'Beta attribution overwritten');
    assert(!/clientRequestId|accessKeyHash|passcodeHash|storageKey/.test(JSON.stringify(notes)),'Private hashes leaked');
    assert.equal(await a.client.query('reviewPublic:getReviewerName',{token:grant.token,accessKey:a.accessKey}),'QA Reviewer Alpha');
    snapshot=await admin.query('personal:snapshot',{});
    assert(snapshot.assets.find(x=>x._id===video._id).feedbackNeedsAttention,'Owner attention flag absent');
    const comment=snapshot.comments.find(n=>n.body===first.body);
    await admin.mutation('personal:ownerToggleCommentComplete',{commentId:comment._id});
    assert((await b.client.query('reviewPublic:listCommentsByVideo',{token:grant.token,accessKey:b.accessKey,videoId:video._id})).find(n=>n._id===comment._id).completedAt,'Handled state did not persist');
    await admin.mutation('personal:ownerToggleCommentComplete',{commentId:comment._id});
    assert(!(await a.client.query('reviewPublic:listCommentsByVideo',{token:grant.token,accessKey:a.accessKey,videoId:video._id})).find(n=>n._id===comment._id).completedAt,'Reopen state did not persist');
    for(const session of [a,b]) { const page=await request(session,`/review/${grant.token}`);assert.equal(page.status,200,'Independent reviewer page reload failed');assert((await page.text()).includes('QA Reviewer'),'Reviewer identity missing page reload'); }
    results.twoReviewerPersisted=true;results.commentRetryDeduplicated=true;results.ownerHandledReopenPersisted=true;
    const original=await request(a,downloadPath(grant,image));assert.equal(original.status,200,'Enabled download failed');assert(original.headers.get('content-disposition')?.startsWith('attachment'),'Download not attachment');assert.equal(hash(Buffer.from(await original.arrayBuffer())),hash(readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg')),'Downloaded bytes differ');
    results.enabledExactDownload=true;
    const noDownload=await link(state.projectId,{canDownload:false});
    assert.equal((await request(null,downloadPath(noDownload,image))).status,404,'Disabled link allowed download');
    await admin.mutation('personal:setAssetDownload',{assetId:image._id,enabled:false});
    assert.equal((await request(a,downloadPath(grant,image))).status,404,'Disabled asset allowed download');
    await admin.mutation('personal:setAssetDownload',{assetId:image._id,enabled:true});
    results.disabledDownloadDenied=true;
    await denied(grant,null,image,'missingProofDenied');
    const wrong=await guest().mutation('reviewLinks:verifyPasscode',{token:grant.token,passcode:'wrong'});assert.equal(wrong.ok,false);results.wrongPasscodeDenied=true;
    const other=await link(state.projectId,{passcode:secret});const proof=await unlock(other,secret);
    await denied(grant,{...proof,token:grant.token,cookie:`rr_review_${grant.token.slice(0,24)}=${proof.accessKey}`},image,'differentLinkProofDenied');
    await denied({token:'invalid-private-review-token'},null,image,'invalidTokenDenied');
    const foreign=snapshot.assets.find(x=>x.projectId!==state.projectId&&x.processingStatus==='ready');assert(foreign,'Foreign-project denial fixture unavailable');
    assert.equal((await request(a,mediaPath(grant,foreign._id))).status,404,'Cross-project media exposed');
    let failed=false;try{await a.client.mutation('reviewPublic:clientSetRating',{token:grant.token,accessKey:a.accessKey,videoId:foreign._id,rating:1});}catch{failed=true;}assert(failed,'Cross-project mutation succeeded');results.wrongProjectDenied=true;
    const warm=await request(a,mediaPath(grant,image._id));assert.equal(warm.status,200);await warm.arrayBuffer();
    await admin.mutation('personal:revokeReviewLink',{linkId:grant.linkId});await denied(grant,a,image,'revokedOpenSessionDenied');
    const arch=await link(state.projectId,{passcode:secret,canDownload:true}), archSession=await unlock(arch,secret);
    await admin.mutation('personal:updateProject',{projectId:state.projectId,archived:true});
    try{await denied(arch,archSession,image,'archivedOpenSessionDenied');}finally{await admin.mutation('personal:updateProject',{projectId:state.projectId,archived:false});}
    const expiresAt=Date.now()+5000, exp=await link(state.projectId,{passcode:secret,canDownload:true,expiresAt}), expSession=await unlock(exp,secret);
    const before=await request(expSession,mediaPath(exp,image._id));assert.equal(before.status,200);await before.arrayBuffer();
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,expiresAt-Date.now())+150));
    await denied(exp,expSession,image,'expiredOpenSessionDenied');
    const summary={releaseVersion:await(await fetch(base+'/_app/version.json')).json(),...results,qaOnly:true,actualPhoneCoverage:false,nativeBrowserCoverage:false};
    writeFileSync('.scratch/release-readiness/private-review-live-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
  }
} catch(cause) { console.error(cause instanceof Error ? cause.message.replace(/https?:\/\/\S+/g,'[private URL]'):'Private review acceptance failed');process.exitCode=1; }
finally { for(const grant of grants) { try{await admin.mutation('personal:revokeReviewLink',{linkId:grant.linkId});}catch{console.error('QA private link cleanup failed');process.exitCode=1;} } }
