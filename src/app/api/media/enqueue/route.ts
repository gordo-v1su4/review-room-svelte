import { NextResponse } from "next/server";
import { createPresignedDownloadUrl } from "@/lib/storage/s3";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      videoId: string;
      storageKey: string;
      previousThumbnailKey?: string;
      previousSpriteKey?: string;
    };
    const workerUrl =
      process.env.MEDIA_WORKER_URL ??
      (process.env.VERCEL ? undefined : "http://127.0.0.1:8787");
    if (!workerUrl) {
      return NextResponse.json(
        {
          error:
            "MEDIA_WORKER_URL is not configured. Preview processing cannot start from this deployment.",
        },
        { status: 500 },
      );
    }
    const workerSecret = process.env.MEDIA_WORKER_SECRET || "dev";
    const sourceUrl = await createPresignedDownloadUrl(body.storageKey);
    const res = await fetch(`${workerUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({
        videoId: body.videoId,
        storageKey: body.storageKey,
        sourceUrl,
        previousThumbnailKey: body.previousThumbnailKey,
        previousSpriteKey: body.previousSpriteKey,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enqueue failed" },
      { status: 500 },
    );
  }
}
