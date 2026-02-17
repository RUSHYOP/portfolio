import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { listGridFSFiles } from "@/lib/gridfs";

export async function GET(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    // Filter by upload type if specified
    const metadata = type ? { uploadType: type } : undefined;
    const files = await listGridFSFiles(metadata);

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      size: file.length,
      uploadedAt: file.uploadDate,
      contentType: (file.metadata as Record<string, unknown>)?.contentType || "application/octet-stream",
      uploadType: (file.metadata as Record<string, unknown>)?.uploadType || "unknown",
      url: `/api/media/${file._id.toString()}`,
    }));

    return NextResponse.json(fileList);
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}
