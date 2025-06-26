import { NextResponse } from "next/server";
import { writeFile, access, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const data = await request.formData();
    const file = data.get("file");
    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { success: false, error: "Mangler fil" },
        { status: 400 },
      );
    }
    
    const albumId = data.get("albumId");
    // Validate albumId exists and sanitize
    if (
      !albumId ||
      typeof albumId !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(albumId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid album ID" },
        { status: 400 },
      );
    }

    // Verify album exists
    const album = await prisma.album.findUnique({ where: { id: albumId } });
    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album ikke fundet" },
        { status: 404 },
      );
    }

    const allowedFileTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!file.type || !allowedFileTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Ikke tilladt filtype." },
        { status: 400 },
      );
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, error: "Filen er for stor." },
        { status: 400 },
      );
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to avoid overwrites
    const sanitized = path.basename(file.name).replace(/[^\w.-]/g, "_");
    const filename  = `${Date.now()}-${sanitized}`;
    const albumUploadDir = path.join(process.cwd(), "album_uploads", albumId);

    // Ensure the album-specific upload directory exists
    try {
      await access(albumUploadDir);
    } catch {
      await mkdir(albumUploadDir, { recursive: true });
    }

    const filepath = path.join(albumUploadDir, filename);

    // Save the file
    await writeFile(filepath, buffer);

    // The URL must now point to a dedicated API endpoint to serve the file
    const mediaUrl = `/api/media/${albumId}/${filename}`;

    // Save to database
    const newMedia = await prisma.media.create({
      data: {
        url: mediaUrl,
        albumId: albumId,
      },
    });

    return NextResponse.json(
      { success: true, media: newMedia },
      { status: 201 },
    );

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload fejlede." },
      { status: 500 },
    );
  }
}
