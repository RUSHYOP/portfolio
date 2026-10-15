import { NextRequest, NextResponse } from "next/server";
import { downloadFromGridFS } from "@/lib/gridfs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { buffer, contentType, filename } = await downloadFromGridFS(fileId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Media fetch error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
