import { NextResponse } from "next/server";
import {
  buildObjectKey,
  createPresignedUploadUrl,
} from "@/lib/storage/s3";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      filename: string;
      contentType: string;
    };
    if (!body.projectId || !body.filename || !body.contentType) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const key = buildObjectKey(body.projectId, body.filename);
    const uploadUrl = await createPresignedUploadUrl(key, body.contentType);
    return NextResponse.json({ uploadUrl, storageKey: key });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presign failed" },
      { status: 500 },
    );
  }
}
