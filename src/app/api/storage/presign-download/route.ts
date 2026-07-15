import { NextResponse } from "next/server";
import { createPresignedDownloadUrl } from "@/lib/storage/s3";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      storageKey: string;
      filename?: string;
    };
    if (!body.storageKey) {
      return NextResponse.json({ error: "storageKey required" }, { status: 400 });
    }
    const downloadUrl = await createPresignedDownloadUrl(
      body.storageKey,
      body.filename,
    );
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presign failed" },
      { status: 500 },
    );
  }
}
