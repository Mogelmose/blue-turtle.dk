import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { mkdtemp, open, rm, stat } from "fs/promises";
import mime from "mime-types";
import os from "os";
import path from "path";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/storage";
import { convertHeicToJpeg } from "@/lib/heic";
import { isSignedRequest } from "@/lib/signedUrl";

export const runtime = "nodejs";
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = [".heic", ".heif"];
const CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=86400";

function createWebReadableStream(nodeStream, abortSignal) {
  let closed = false;
  let cleanup = () => {};
  let onAbort = null;

  const safeClose = (controller) => {
    if (closed) {
      return;
    }
    closed = true;
    cleanup();
    controller.close();
  };

  const safeError = (controller, error) => {
    if (closed) {
      return;
    }
    closed = true;
    cleanup();
    controller.error(error);
  };

  return new ReadableStream({
    start(controller) {
      const onData = (chunk) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(chunk);
        } catch (error) {
          if (error?.code === "ERR_INVALID_STATE") {
            safeClose(controller);
            return;
          }
          safeError(controller, error);
        }
      };

      const onEnd = () => safeClose(controller);

      const onError = (error) => {
        if (abortSignal?.aborted || error?.code === "ERR_STREAM_PREMATURE_CLOSE") {
          safeClose(controller);
          return;
        }
        safeError(controller, error);
      };

      onAbort = () => {
        nodeStream.destroy();
        safeClose(controller);
      };

      cleanup = () => {
        nodeStream.off("data", onData);
        nodeStream.off("end", onEnd);
        nodeStream.off("close", onEnd);
        nodeStream.off("error", onError);
        if (abortSignal && onAbort) {
          abortSignal.removeEventListener("abort", onAbort);
        }
      };

      nodeStream.on("data", onData);
      nodeStream.on("end", onEnd);
      nodeStream.on("close", onEnd);
      nodeStream.on("error", onError);

      if (abortSignal) {
        abortSignal.addEventListener("abort", onAbort, { once: true });
      }
    },
    cancel() {
      if (closed) {
        return;
      }
      closed = true;
      if (abortSignal && onAbort) {
        abortSignal.removeEventListener("abort", onAbort);
      }
      nodeStream.destroy();
      cleanup();
    },
  });
}

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

function buildCacheHeaders(fileStat) {
  const etag = `W/\"${fileStat.size}-${fileStat.mtimeMs}\"`;
  return {
    "Cache-Control": CACHE_CONTROL,
    ETag: etag,
    "Last-Modified": fileStat.mtime.toUTCString(),
  };
}

function isNotModified(request, etag, lastModified) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true;
  }
  const ifModifiedSince = request.headers.get("if-modified-since");
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince).getTime();
    const modified = new Date(lastModified).getTime();
    if (!Number.isNaN(since) && since >= modified) {
      return true;
    }
  }
  return false;
}

async function isJpegFile(absolutePath) {
  const file = await open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(3);
    await file.read(buffer, 0, 3, 0);
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  } finally {
    await file.close();
  }
}

async function createTempJpegResponse({ absolutePath, filename, signal }) {
  if (await isJpegFile(absolutePath)) {
    const fileStat = await stat(absolutePath);
    return createStaticJpegResponse({
      absolutePath,
      filename,
      size: fileStat.size,
      signal,
      cacheHeaders: buildCacheHeaders(fileStat),
    });
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "heic-"));
  const tempOutput = path.join(tempDir, "converted.jpg");

  await convertHeicToJpeg(absolutePath, tempOutput);
  const tempStat = await stat(tempOutput);

  const stream = createReadStream(tempOutput);
  const body = createWebReadableStream(stream, signal);

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await rm(tempDir, { recursive: true, force: true });
  };

  stream.on("close", () => {
    void cleanup();
  });
  stream.on("error", () => {
    void cleanup();
  });

  const sourceStat = await stat(absolutePath);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": tempStat.size.toString(),
      "Content-Disposition": `inline; filename="${getJpegFilename(filename)}"`,
      ...buildCacheHeaders(sourceStat),
    },
  });
}

function createStaticJpegResponse({ absolutePath, filename, size, signal, cacheHeaders }) {
  const stream = createReadStream(absolutePath);
  const body = createWebReadableStream(stream, signal);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": size.toString(),
      "Content-Disposition": `inline; filename="${getJpegFilename(filename)}"`,
      ...(cacheHeaders || {}),
    },
  });
}

async function getMediaContext(slug): Promise<any> {
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
  const etag = `W/\"${fileStat.size}-${fileStat.mtimeMs}\"`;
  const lastModified = fileStat.mtime.toUTCString();

  return {
    absolutePath,
    size: fileStat.size,
    contentType,
    filename: mediaRecord.filename ?? "media",
    storagePath: mediaRecord.storagePath,
    mimeType: mediaRecord.mimeType ?? null,
    convertedPath: mediaRecord.convertedPath ?? null,
    etag,
    lastModified,
    fileStat,
  };
}

export async function HEAD(request, { params }) {
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const context = await getMediaContext(slug);

    if (context.error) {
      return context.error;
    }

    const cacheHeaders = buildCacheHeaders(context.fileStat);
    if (!signed && isNotModified(request, context.etag, context.lastModified)) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
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
              ...cacheHeaders,
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
          ...cacheHeaders,
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
        ...cacheHeaders,
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
  const signed = isSignedRequest(request);
  const session = signed ? null : await getServerSession(authOptions);
  if (!signed && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const context = await getMediaContext(slug);

    if (context.error) {
      return context.error;
    }

    const cacheHeaders = buildCacheHeaders(context.fileStat);
    if (!signed && isNotModified(request, context.etag, context.lastModified)) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
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
            signal: request.signal,
            cacheHeaders,
          });
        } catch {
          // Fall back to on-the-fly conversion.
        }
      }

      return await createTempJpegResponse({ ...context, signal: request.signal });
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
      const body = createWebReadableStream(stream, request.signal);

      return new Response(body, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename="${filename}"`,
          ...cacheHeaders,
        },
      });
    }

    const stream = createReadStream(absolutePath);
    const body = createWebReadableStream(stream, request.signal);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": size.toString(),
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${filename}"`,
        ...cacheHeaders,
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

