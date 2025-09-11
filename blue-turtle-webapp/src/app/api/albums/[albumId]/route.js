import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { albumId } = params;
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { media: true },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(album);
  } catch (error) {
    console.error("Failed to fetch album:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch album" },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 401 },
    );
  }

  try {
    const { albumId } = params;
    const formData = await request.formData();
    const name = formData.get("name");
    const infoText = formData.get("infoText");
    const category = formData.get("category");
    const coverImageFile = formData.get("coverImage");
    const coverImageUrl = formData.get("coverImageUrl");
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");
    const locationName = formData.get("locationName");

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: "Navn og kategori er påkrævet" },
        { status: 400 },
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { success: false, error: "Navn skal være under 50 tegn." },
        { status: 400 },
      );
    }

    if (!["REJSER", "SPILLEAFTEN", "JULEFROKOST"].includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category." },
        { status: 400 },
      );
    }

    // Handle cover image upload
    let finalCoverImageUrl = coverImageUrl; // Keep existing URL as default

    if (coverImageFile && coverImageFile.size > 0) {
      const buffer = Buffer.from(await coverImageFile.arrayBuffer());
      const filename = `${Date.now()}-${coverImageFile.name.replace(/[^a-z0-9æøå]/gi, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/covers");
      const savePath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      await writeFile(savePath, buffer);
      finalCoverImageUrl = `/uploads/covers/${filename}`;
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        name,
        infoText,
        category,
        coverImage: finalCoverImageUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationName: locationName || null,
      },
    });

    return NextResponse.json(updatedAlbum);
  } catch (error) {
    console.error("Failed to update album:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update album" },
      { status: 500 },
    );
  }
}
