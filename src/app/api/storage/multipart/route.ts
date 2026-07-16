import { NextResponse } from "next/server";
import {
  abortMultipartUpload,
  buildObjectKey,
  completeMultipartUpload,
  createMultipartUpload,
  createPresignedPartUploadUrl,
} from "@/lib/storage/s3";

type CompletedPart = {
  ETag: string;
  PartNumber: number;
};

function isCompletedPart(value: unknown): value is CompletedPart {
  if (!value || typeof value !== "object") return false;
  const part = value as Partial<CompletedPart>;
  return (
    typeof part.ETag === "string" &&
    part.ETag.length > 0 &&
    Number.isInteger(part.PartNumber) &&
    (part.PartNumber ?? 0) >= 1 &&
    (part.PartNumber ?? 0) <= 10_000
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "create") {
      if (
        typeof body.projectId !== "string" ||
        !body.projectId ||
        typeof body.filename !== "string" ||
        !body.filename ||
        typeof body.contentType !== "string" ||
        !body.contentType
      ) {
        return NextResponse.json({ error: "Invalid multipart create payload" }, { status: 400 });
      }
      const storageKey = buildObjectKey(body.projectId, body.filename);
      const uploadId = await createMultipartUpload(storageKey, body.contentType);
      return NextResponse.json({ storageKey, uploadId });
    }

    if (body.action === "part") {
      if (
        typeof body.storageKey !== "string" ||
        !body.storageKey ||
        typeof body.uploadId !== "string" ||
        !body.uploadId ||
        !Number.isInteger(body.partNumber) ||
        (body.partNumber as number) < 1 ||
        (body.partNumber as number) > 10_000
      ) {
        return NextResponse.json({ error: "Invalid multipart part payload" }, { status: 400 });
      }
      const uploadUrl = await createPresignedPartUploadUrl(
        body.storageKey,
        body.uploadId,
        body.partNumber as number,
      );
      return NextResponse.json({ uploadUrl });
    }

    if (body.action === "complete") {
      if (
        typeof body.storageKey !== "string" ||
        !body.storageKey ||
        typeof body.uploadId !== "string" ||
        !body.uploadId ||
        !Array.isArray(body.parts) ||
        !body.parts.length ||
        !body.parts.every(isCompletedPart)
      ) {
        return NextResponse.json(
          { error: "Invalid multipart completion payload" },
          { status: 400 },
        );
      }
      await completeMultipartUpload(body.storageKey, body.uploadId, body.parts);
      return NextResponse.json({ storageKey: body.storageKey });
    }

    if (body.action === "abort") {
      if (
        typeof body.storageKey !== "string" ||
        !body.storageKey ||
        typeof body.uploadId !== "string" ||
        !body.uploadId
      ) {
        return NextResponse.json({ error: "Invalid multipart abort payload" }, { status: 400 });
      }
      await abortMultipartUpload(body.storageKey, body.uploadId);
      return NextResponse.json({ aborted: true });
    }

    return NextResponse.json({ error: "Unknown multipart action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Multipart upload failed" },
      { status: 500 },
    );
  }
}
