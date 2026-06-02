import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/media/process-complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MEDIA_WORKER_SECRET;
    const auth = request.headers.get("authorization");
    if (!secret || auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    const body = (await request.json()) as {
      videoId: string;
      thumbnailKey?: string;
      spriteKey?: string;
      durationSec?: number;
      width?: number;
      height?: number;
      error?: boolean;
    };
    await ctx.runMutation(internal.videosInternal.setProcessingCompleteInternal, {
      videoId: body.videoId as import("./_generated/dataModel").Id<"videos">,
      thumbnailKey: body.thumbnailKey,
      spriteKey: body.spriteKey,
      durationSec: body.durationSec,
      width: body.width,
      height: body.height,
      error: body.error,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
