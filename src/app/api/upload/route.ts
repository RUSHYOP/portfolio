import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { uploadToGridFS } from "@/lib/gridfs";

const UPLOAD_LIMITS: Record<string, { maxBytes: number; maxWidth: number; maxHeight: number; extensions: string[] }> = {
  profile: { maxBytes: 2 * 1024 * 1024, maxWidth: 800, maxHeight: 800, extensions: ["jpg", "jpeg", "png", "webp"] },
  project_icon: { maxBytes: 512 * 1024, maxWidth: 256, maxHeight: 256, extensions: ["jpg", "jpeg", "png", "webp", "svg"] },
  skill_icon: { maxBytes: 200 * 1024, maxWidth: 128, maxHeight: 128, extensions: ["jpg", "jpeg", "png", "webp", "svg"] },
  audio: { maxBytes: 10 * 1024 * 1024, maxWidth: 0, maxHeight: 0, extensions: ["mp3", "ogg", "wav"] },
};

export async function POST(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: "File and type are required" }, { status: 400 });
    }

    const limits = UPLOAD_LIMITS[type];
    if (!limits) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    // Validate file size
    if (file.size > limits.maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${(limits.maxBytes / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!limits.extensions.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${limits.extensions.join(", ")}` },
        { status: 400 }
      );
    }

    // Prepare filename and content type
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}_${safeName}`;
    const contentType = file.type || "application/octet-stream";

    // Upload to GridFS
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = await uploadToGridFS(buffer, filename, contentType, {
      uploadType: type,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });

    // Return path in format /api/media/{fileId}
    const path = `/api/media/${fileId}`;

    return NextResponse.json({
      path,
      fileId,
      filename,
      size: file.size,
      limits: { maxWidth: limits.maxWidth, maxHeight: limits.maxHeight },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ limits: UPLOAD_LIMITS });
}
