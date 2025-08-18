import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// GET all albums
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const albums = await prisma.album.findMany({
      skip,
      take: limit,
      include: {
        media: true, // Include media to show a cover image
      },
    });

    const total = await prisma.album.count();
    return NextResponse.json({
      albums,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { message: "Error fetching albums" },
      { status: 500 },
    );
  }
}

// POST a new album
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Not authorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const infoText = formData.get("infoText");
    const category = formData.get("category");
    const coverImageFile = formData.get("coverImage");
    const allowedCategories = ["SPILLEAFTEN", "REJSER", "JULEFROKOST"]; // Update based on your schema

    if (!name || !infoText || !category) {
      return NextResponse.json(
        { message: "Missing required text fields" },
        { status: 400 },
      );
    }

    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { message: "Invalid category" },
        { status: 400 },
      );
    }

    let coverImageUrl = null;

    if (coverImageFile && coverImageFile.size > 0) {
      const buffer = Buffer.from(await coverImageFile.arrayBuffer());
      const filename = `${Date.now()}-${coverImageFile.name.replace(/[^a-z0-9æøå]/gi, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/covers");
      const savePath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      await writeFile(savePath, buffer);
      coverImageUrl = `/uploads/covers/${filename}`;
    }

    async function generateUniqueAlbumId(name) {
      let baseId = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "");
      let id = baseId;
      let counter = 1;

      while (await prisma.album.findUnique({ where: { id } })) {
        id = `${baseId}-${counter}`;
        counter++;
      }

      return id;
    }

    const newAlbum = await prisma.album.create({
      data: {
        id: await generateUniqueAlbumId(name),
        name,
        infoText,
        category,
        coverImage: coverImageUrl,
      },
    });

    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json(
      { message: "Error creating album" },
      { status: 500 },
    );
  }
}
