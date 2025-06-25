import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import path from "path";
import mime from "mime-types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  // Add authentication check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;

    // Add defensive checks for the slug parameter
    if (!slug || slug.length < 2) {
      return NextResponse.json(
        {
          error: "Invalid file path. Expected /api/media/[albumId]/[filename].",
        },
        { status: 400 },
      );
    }

    const [albumId, filename] = slug;

    // Validate inputs to prevent path traversal
    if (
      albumId.includes("..") ||
      albumId.includes("/") ||
      albumId.includes("\\")
    ) {
      return NextResponse.json({ error: "Invalid album ID." }, { status: 400 });
    }

    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
    }

    const filePath = path.join(
      process.cwd(),
      "album_uploads",
      albumId,
      filename,
    );

    // Read the file from the filesystem
const fileStream = createReadStream(filePath);
const { size } = statSync(filePath);

// Determine the content type from the filename
const contentType = mime.lookup(filename) || "application/octet-stream";

// Return the file with the correct headers
return new NextResponse(fileStream, {
  status: 200,
  headers: {
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${filename}"`,
   "Content-Length": size,
  },
});

  } catch (error) {
    // If the file doesn't exist (ENOENT), return a 404
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    console.error("Media stream error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
