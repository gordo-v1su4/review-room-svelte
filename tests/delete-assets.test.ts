import {test,expect} from 'bun:test';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {internal} from '../convex/_generated/api';

const modules=Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({cwd:'convex'})].map(file=>[`../convex/${file}`,()=>import(`../convex/${file}`)]));
async function fixture(role:'admin'|'client'='admin') {
 const t=convexTest(schema,modules);
 const data=await t.run(async ctx=>{
  const user=await ctx.db.insert('users',{email:'owner@review-room.invalid'});
  const owner=await ctx.db.insert('appUsers',{authUserId:user,name:'Owner',role});
  const otherUser=await ctx.db.insert('users',{email:'other@example.invalid'});
  const other=await ctx.db.insert('appUsers',{authUserId:otherUser,name:'Other',role:'admin'});
  const project=await ctx.db.insert('projects',{title:'Private',slug:'private',createdBy:owner,createdAt:1,updatedAt:1,downloadEnabledByDefault:false});
  const otherProject=await ctx.db.insert('projects',{title:'Other',slug:'other',createdBy:other,createdAt:1,updatedAt:1,downloadEnabledByDefault:false});
  const assets=[];
  for(const [index,projectId] of [project,project,otherProject].entries()) {
   const id=await ctx.db.insert('videos',{projectId,title:`Clip ${index}`,assetCode:`VID_${index}`,originalFilename:`${index}.mp4`,storageKey:`assets/${index}/original.mp4`,mimeType:'video/mp4',status:'awaiting_review',viewed:false,rating:0,isSelect:false,commentCount:0,tags:[],downloadEnabled:false,order:index,uploadedBy:owner,uploadedAt:1,updatedAt:1,processingStatus:'ready'});
   const version=await ctx.db.insert('assetVersions',{assetId:id,version:1,originalKey:`assets/${index}/original.mp4`,posterKey:`assets/${index}/poster.jpg`,mimeType:'video/mp4',sizeBytes:100,processingState:'ready',createdAt:1});
   await ctx.db.patch(id,{currentVersionId:version});
   assets.push(id);
  }
  const comment=await ctx.db.insert('comments',{videoId:assets[0],projectId:project,authorName:'Reviewer',authorRole:'client',body:'A note',createdAt:1});
  await ctx.db.insert('commentReactions',{commentId:comment,videoId:assets[0],projectId:project,appUserId:owner,emoji:'heart',createdAt:1});
  const publication=await ctx.db.insert('publications',{assetId:assets[0],versionId:(await ctx.db.get(assets[0]))!.currentVersionId!,slug:'public-clip',allowedOrigins:[],createdAt:1,updatedAt:1});
  await ctx.db.insert('showcases',{title:'Showcase',slug:'show',publicationIds:[publication],allowedOrigins:[],createdAt:1,updatedAt:1});
  return {project,otherProject,assets};
 });
 return {t,...data};
}
test('owner deletion removes only selected clips and their versions, feedback and publication from the workspace',async()=>{
 const {t,project,assets}=await fixture();
 await t.mutation(internal.personal.deleteSelectedAssets,{projectId:project,assetIds:[assets[0]]});
 const view=await t.query(internal.personal.snapshot,{});
 expect(view.assets.map(asset=>asset._id)).toEqual([assets[1]]);
 expect(view.versions.map(version=>version.assetId)).toEqual([assets[1]]);
 expect(view.comments).toEqual([]);
 expect(view.publications).toEqual([]);
 expect(view.showcases[0].publicationIds).toEqual([]);
});
test('mixed-project deletion rejects the entire selection and leaves owned clips intact',async()=>{
 const {t,project,assets}=await fixture();
 await expect(t.mutation(internal.personal.deleteSelectedAssets,{projectId:project,assetIds:[assets[0],assets[2]]})).rejects.toThrow('Selection changed');
 expect((await t.query(internal.personal.snapshot,{})).assets).toHaveLength(2);
});
test('client cannot perform owner deletion even with valid clip ids',async()=>{
 const {t,project,assets}=await fixture('client');
 await expect(t.mutation(internal.personal.deleteSelectedAssets,{projectId:project,assetIds:[assets[0]]})).rejects.toThrow('Personal owner unavailable');
});
