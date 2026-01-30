import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import mime from "mime-types";
import { Readable } from "stream";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/storage";

export const runtime = "nodejs";
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = [".heic", ".heif"];

function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader) {
    return null;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) {
    return null;
  }

  const startToken = match[1];
  const endToken = match[2];

  if (!startToken && endToken) {
    const suffixLength = Number.parseInt(endToken, 10);
    if (Number.isNaN(suffixLength) || suffixLength <= 0) {
      return null;
    }
    const start = Math.max(size - suffixLength, 0);
    return { start, end: size - 1 };
  }

  const start = startToken ? Number.parseInt(startToken, 10) : 0;
  const end = endToken ? Number.parseInt(endToken, 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return null;
  }

  return { start, end };
}

function isHeicAsset({ contentType, mimeType, filename, storagePath }) {
  const normalizedMime = (mimeType || contentType || "").toLowerCase();
  if (HEIC_MIME_TYPES.has(normalizedMime)) {
    return true;
  }

  const reference = `${filename ?? ""} ${storagePath ?? ""}`.toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => reference.endsWith(ext));
}

function wantsJpeg(request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  return format === "jpg" || format === "jpeg";
}

function getJpegFilename(filename) {
  const base = filename?.replace(/\.[^/.]+$/, "") || "media";
  return `${base}.jpg`;
}

function createJpegResponse({ absolutePath, filename }) {
  const readStream = createReadStream(absolutePath);
  const transformer = sharp().rotate().jpeg({ quality: 82 });
  const convertedStream = readStream.pipe(transformer);
  const body = Readable.toWeb(convertedStream);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${getJpegFilename(filename)}"`,
    },
  });
}

function createStaticJpegResponse({ absolutePath, filename, size }) {
  const stream = createReadStream(absolutePath);
  const body = Readable.toWeb(stream);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": size.toString(),
      "Content-Disposition": `inline; filename="${getJpegFilename(filename)}"`,
    },
  });
}

async function getMediaContext(slug) {
  if (!slug || slug.length < 1 || slug.length > 2) {
    return {
      error: NextResponse.json({ error: "Invalid file path." }, { status: 400 }),
    };
  }

  let mediaRecord = null;

  if (slug.length === 1) {
    const [mediaId] = slug;
    mediaRecord = await prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        storagePath: true,
        mimeType: true,
        filename: true,
        convertedPath: true,
      },
    });
  } else {
    const [albumId, filename] = slug;
    mediaRecord = await prisma.media.findFirst({
      where: { albumId, filename },
      select: {
        storagePath: true,
        mimeType: true,
        filename: true,
        convertedPath: true,
      },
    });
  }

  if (!mediaRecord?.storagePath) {
    return {
      error: NextResponse.json({ error: "File not found." }, { status: 404 }),
    };
  }

  const absolutePath = resolveUploadPath(mediaRecord.storagePath);
  const fileStat = await stat(absolutePath);
  const lookup = mime.lookup(mediaRecord.filename || mediaRecord.storagePath || "");
  const contentType =
    mediaRecord.mimeType ||
    (typeof lookup === "string" ? lookup : null) ||
    "application/octet-stream";

  return {
    absolutePath,
    size: fileStat.size,
    contentType,
    filename: mediaRecord.filename ?? "media",
    storagePath: mediaRecord.storagePath,
    mimeType: mediaRecord.mimeType ?? null,
    convertedPath: mediaRecord.convertedPath ?? null,
  };
}

export async function HEAD(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const context = await getMediaContext(slug);

    if (context.error) {
      return context.error;
    }

    if (wantsJpeg(request) && isHeicAsset(context)) {
      if (context.convertedPath) {
        try {
          const convertedAbsolutePath = resolveUploadPath(context.convertedPath);
          const convertedStat = await stat(convertedAbsolutePath);
          return new NextResponse(null, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Length": convertedStat.size.toString(),
              "Content-Disposition": `inline; filename="${getJpegFilename(context.filename)}"`,
            },
          });
        } catch {
          // Fall back to on-the-fly conversion.
        }
      }

      return new NextResponse(null, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `inline; filename="${getJpegFilename(context.filename)}"`,
        },
      });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": context.contentType,
        "Content-Length": context.size.toString(),
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${context.filename}"`,
      },
    });
  } catch (error) {
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

export async function GET(request, { params }) {
  // Add authentication check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const context = await getMediaContext(slug);

    if (context.error) {
      return context.error;
    }

    if (wantsJpeg(request) && isHeicAsset(context)) {
      if (context.convertedPath) {
        try {
          const convertedAbsolutePath = resolveUploadPath(context.convertedPath);
          const convertedStat = await stat(convertedAbsolutePath);
          return createStaticJpegResponse({
            absolutePath: convertedAbsolutePath,
            filename: context.filename,
            size: convertedStat.size,
          });
        } catch {
          // Fall back to on-the-fly conversion.
        }
      }

      return createJpegResponse(context);
    }

    const { absolutePath, size, contentType, filename } = context;

    const rangeHeader = request.headers.get("range");
    const range = parseRangeHeader(rangeHeader, size);

    if (rangeHeader && !range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
        },
      });
    }

    if (range) {
      const { start, end } = range;
      const chunkSize = end - start + 1;
      const stream = createReadStream(absolutePath, { start, end });
      const body = Readable.toWeb(stream);

      return new Response(body, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename="${filename}"`,
        },
      });
    }

    const stream = createReadStream(absolutePath);
    const body = Readable.toWeb(stream);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": size.toString(),
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${filename}"`,
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
