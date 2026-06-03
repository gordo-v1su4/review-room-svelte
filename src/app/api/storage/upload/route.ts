import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { buildObjectKey, getBucket, getS3Client } from "@/lib/storage/s3";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId");
    const file = formData.get("file");

    if (typeof projectId !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const storageKey = buildObjectKey(projectId, file.name);
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type || "application/octet-stream",
      }),
    );

    return NextResponse.json({ storageKey });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
