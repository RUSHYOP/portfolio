import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { uploadToGridFS } from "@/lib/gridfs";

/** Parse width/height from PNG or JPEG buffer headers without external libraries. */
function parseImageDimensions(buffer: Buffer, ext: string): { width: number; height: number } | null {
  try {
    // PNG: bytes 0-7 are signature, IHDR chunk starts at byte 8; width at 16, height at 20 (big-endian)
    if (ext === "png" && buffer.length >= 24 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
    if ((ext === "jpg" || ext === "jpeg") && buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }
    // WebP: RIFF header, "WEBP" at offset 8, VP8 chunk width/height varies — skip for now
    // TODO: Add WebP and SVG dimension parsing (consider using a library like `image-size`)
  } catch {
    // Malformed header — fall through
  }
  return null;
}

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

    // Read file buffer for upload and optional dimension check
    const buffer = Buffer.from(await file.arrayBuffer());

    // Enforce image dimension limits
    if (limits.maxWidth > 0 && limits.maxHeight > 0) {
      const dims = parseImageDimensions(buffer, ext);
      if (dims) {
        if (dims.width > limits.maxWidth || dims.height > limits.maxHeight) {
          return NextResponse.json(
            { error: `Image dimensions ${dims.width}x${dims.height} exceed maximum ${limits.maxWidth}x${limits.maxHeight}` },
            { status: 400 }
          );
        }
      }
      // If dimensions can't be parsed (e.g. SVG or unsupported format), skip the check
    }
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
