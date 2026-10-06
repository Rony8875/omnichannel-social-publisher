import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const contentType = request.headers.get("content-type") || "";

    // 1. Multipart Form Data upload (Primary & Best for large videos & images)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "File nahi mili!" }, { status: 400 });
      }

      const originalName = file.name || "media";
      const mimeType = file.type || "application/octet-stream";
      const isVideo = mimeType.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(originalName);

      // Determine file extension
      let ext = originalName.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
      if (ext === "blob" || !ext) ext = isVideo ? "mp4" : "jpg";

      const prefix = isVideo ? "reel_video" : "post_img";
      const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        mediaType: isVideo ? "video" : "image",
        mimeType,
        name: originalName,
        size: file.size,
        message: `${isVideo ? "Video / Reel" : "Image"} successfully add ho gayi!`,
      });
    }

    // 2. Base64 JSON fallback
    const body = await request.json().catch(() => ({}));
    if (body.dataUrl && typeof body.dataUrl === "string") {
      const { dataUrl, filename: reqFilename = "media" } = body;
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ success: false, error: "Invalid Base64 Data URL format" }, { status: 400 });
      }

      const mimeType = matches[1];
      const isVideo = mimeType.startsWith("video/");
      let ext = isVideo ? "mp4" : mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const prefix = isVideo ? "reel_video" : "post_img";
      const filename = `${prefix}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      const buffer = Buffer.from(matches[2], "base64");
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${filename}`,
        mediaType: isVideo ? "video" : "image",
        mimeType,
        name: reqFilename,
        size: buffer.length,
        message: `${isVideo ? "Video / Reel" : "Image"} successfully add ho gayi!`,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported upload format" }, { status: 400 });
  } catch (err: any) {
    console.error("Media upload error:", err);
    return NextResponse.json({ success: false, error: `Upload error: ${err.message}` }, { status: 500 });
  }
}
