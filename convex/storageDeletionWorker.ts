"use node";
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

export const run = internalAction({
  args:{jobId:v.id('storageDeletionJobs')},
  handler: async (ctx,{jobId}):Promise<void> => {
    const job=await ctx.runQuery(internal.storageDeletion.get,{jobId});
    if(!job) return;
    try {
      if(process.env.S3_ENDPOINT!=='https://s3.v1su4.dev' || process.env.S3_BUCKET!=='review-room-svelte' ||
        !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || job.keys.some((key:string)=>!key.startsWith('assets/'))) throw new Error('Storage deletion configuration unavailable');
      const storage=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,
        credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
      for(let offset=0;offset<job.keys.length;offset+=1000) {
        const result=await storage.send(new DeleteObjectsCommand({Bucket:process.env.S3_BUCKET,Delete:{Quiet:true,Objects:job.keys.slice(offset,offset+1000).map((Key:string)=>({Key}))}}));
        if(result.Errors?.length) throw new Error('Storage cleanup incomplete');
      }
      await ctx.runMutation(internal.storageDeletion.complete,{jobId});
    } catch {
      console.error('Review Room storage deletion will retry');
      await ctx.runMutation(internal.storageDeletion.retry,{jobId});
    }
  }
});
