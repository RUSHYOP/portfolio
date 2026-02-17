import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import fs from "fs";
import path from "path";

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

    // Determine save path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}_${safeName}`;

    let saveDir: string;
    let publicPath: string;

    switch (type) {
      case "profile":
        saveDir = path.join(process.cwd(), "public", "images");
        publicPath = `/images/${filename}`;
        break;
      case "project_icon":
        saveDir = path.join(process.cwd(), "public", "icons", "projects");
        publicPath = `/icons/projects/${filename}`;
        break;
      case "skill_icon":
        saveDir = path.join(process.cwd(), "public", "images");
        publicPath = `/images/${filename}`;
        break;
      case "audio":
        saveDir = path.join(process.cwd(), "public", "audio");
        publicPath = `/audio/${filename}`;
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Ensure directory exists
    fs.mkdirSync(saveDir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(saveDir, filename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      path: publicPath,
      filename,
      size: file.size,
      limits: { maxWidth: limits.maxWidth, maxHeight: limits.maxHeight },
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ limits: UPLOAD_LIMITS });
}
