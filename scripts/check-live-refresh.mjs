import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
const origin='https://review.v1su4.dev', target='https://media.v1su4.dev/trailer-feed';
const c=new ConvexHttpClient('https://review-convex.v1su4.dev'); c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const fixture=JSON.parse(readFileSync('.scratch/release-readiness/activity-observation.json.local','utf8'));
const auth=await fetch(origin+'/studio/sign-in?/email',{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'gordo@v1su4.com',password:process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD})});
const cookie=auth.headers.get('set-cookie')?.split(';')[0]; assert(cookie,'Owner session unavailable');
const canonical=process.argv.includes('--canonical');
const projectId=canonical ? 'ks70059gkp2ndsw6gy8a2sr5758fqfgk' : fixture.projectId;
const snapshot=await c.query('personal:snapshot',{});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonicalDigest=s=>{const assets=s.assets.filter(a=>a.projectId==='ks70059gkp2ndsw6gy8a2sr5758fqfgk');const ids=new Set(assets.map(a=>a._id));return digest({assets,versions:s.versions.filter(v=>ids.has(v.assetId)),imports:s.sourceImports});};
const beforeCanonical=canonicalDigest(snapshot);
const sync=await c.query('destinationSync:snapshot',{projectId});
const job=sync.items.find(j=>j.state==='synced' && (canonical || j.versionId===fixture.versionId)); assert(job,'Published exact version missing');
const connection=sync.connections.find(x=>x._id===job.connectionId); assert(connection,'Connection missing');
const catalog=async()=>{const r=await fetch(`${target}/data/comparisons/${connection.targetRunId}/artifacts.json`);assert(r.ok,'Target catalog missing');return r.json();};
const before=await catalog(), artifact=before.find(a=>a.artifact_id===job.targetArtifactId); assert(artifact,'Target version missing');
const version=snapshot.versions.find(v=>v._id===job.versionId); assert(version,'Source version missing');
let revision=version.metadataUpdatedAt??null;
if(!canonical){
  const image=snapshot.versions.find(v=>v.processingState==='ready' && v.mimeType.startsWith('image/') && snapshot.assets.some(a=>a._id===v.assetId && a.projectId===projectId)); assert(image,'Ready same-project QA image missing');
  const saved=await c.mutation('personal:updateVersionMetadata',{versionId:version._id,expectedUpdatedAt:revision,metadata:{sourceLabel:'Refresh QA',model:'Refresh QA model',prompt:'Frozen refresh prompt',notes:'Fill empty notes',gridImageVersionId:image._id,referenceImageVersionIds:[]}});
  revision=saved.updatedAt;
  if(revision===undefined) revision=(await c.query('destinationSync:workspace',{projectId})).versions.find(v=>v.versionId===version._id).expectedMetadataUpdatedAt;
}
const consent={action:'refresh',jobId:job.id,operationId:randomUUID(),expectedGeneration:job.consentGeneration,expectedMetadataUpdatedAt:revision};
const owner=async body=>{const r=await fetch(origin+'/api/owner-sync',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok,`Refresh operation failed (${r.status})`);return r.json();};
const saved=await owner(consent); assert.deepEqual(await owner(consent),saved,'Confirmation replay differs');
for(let i=0;i<30;i++){const operations=await c.query('destinationRefresh:snapshot',{projectId});const operation=operations.find(x=>x.id===saved.refreshId);if(operation.state==='complete')break;assert(!['failed','disconnected'].includes(operation.state),'Refresh delivery failed');await new Promise(r=>setTimeout(r,1000));}
assert.equal((await c.query('destinationRefresh:snapshot',{projectId})).find(x=>x.id===saved.refreshId).state,'complete');
const after=await catalog(), current=after.find(a=>a.artifact_id===artifact.artifact_id);
assert.equal(current.media_url,artifact.media_url); assert.equal(current.version_number,artifact.version_number);assert.equal(current.created_at,artifact.created_at);
if(artifact.shot_grid_url) assert.equal(current.shot_grid_url,artifact.shot_grid_url);
if(artifact.version_prompt) assert.equal(current.version_prompt,artifact.version_prompt);
if(artifact.video_model) assert.equal(current.video_model,artifact.video_model);
if(!canonical){ assert.equal(current.version_prompt,'Frozen refresh prompt');assert(current.shot_grid_url,'New image was not published');const image=await fetch(current.shot_grid_url);assert(image.ok && Number(image.headers.get('content-length'))>0,'New bounded image grant not readable'); }
assert.equal(canonicalDigest(await c.query('personal:snapshot',{})),beforeCanonical,'Canonical originals/metadata changed');
const summary={canonical,revision:(await(await fetch(origin+'/_app/version.json')).json()).version,refreshComplete:true,confirmationReplay:true,rootUrlStable:true,targetNumberStable:true,preservedTargetEdits:true,boundedNewImage:!canonical,canonicalUnchanged:true};
writeFileSync(`.scratch/release-readiness/v1s177-${canonical?'canonical':'synthetic'}-summary.json`,JSON.stringify(summary,null,2)); console.log(JSON.stringify(summary));

