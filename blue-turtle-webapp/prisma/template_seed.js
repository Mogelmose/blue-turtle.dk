/**
 * =================================================================================
 * TEMPLATE SEED SCRIPT
 * =================================================================================
 *
 * This script is a template for seeding your database with initial data.
 * It supports unique passwords for every user by reading them from environment variables.
 *
 * HOW TO USE:
 * 1. For EACH user you define below, add a corresponding password variable to your .env file:
 *    PASSWORD_ADMIN="your_admin_password"
 *    PASSWORD_USER1="user_one_password"
 *    PASSWORD_USER2="another_password"
 * 2. Customize the `usersToCreate` and `albumsToCreate` arrays below with your own data.
 *
 * IMPORTANT: `prisma/seed.js` should be in your .gitignore file! (if you cloned this repo it is)
 *
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { copyFile, mkdir, stat } from "fs/promises";

const prisma = new PrismaClient();

// Seed assets should be stored under prisma/seed-assets.
const SEED_ASSETS_ROOT = path.resolve("prisma", "seed-assets");
const UPLOAD_ROOT = getUploadRoot();
const RESOLVED_UPLOAD_ROOT = path.resolve(UPLOAD_ROOT);
const SHOULD_OVERWRITE_ASSETS = process.env.SEED_OVERWRITE_ASSETS === "true";

// For each user, specify a deterministic ID, username, role, and the EXACT
// name of the environment variable that holds their password.
const usersToCreate = [
  {
    id: "admin-user",
    username: "AdminUser",
    role: "ADMIN",
    passwordEnvVar: "PASSWORD_ADMIN",
    avatarAsset: "avatars/admin-user.jpg",
  },
  {
    id: "user-one",
    username: "UserOne",
    role: "REGULAR",
    passwordEnvVar: "PASSWORD_USER1",
    avatarAsset: "avatars/user-one.jpg",
  },
  {
    id: "user-two",
    username: "UserTwo",
    role: "REGULAR",
    passwordEnvVar: "PASSWORD_USER2",
    avatarAsset: "avatars/user-two.jpg",
  },
  {
    id: "user-three",
    username: "UserThree",
    role: "REGULAR",
    passwordEnvVar: "PASSWORD_USER3",
    avatarAsset: "avatars/user-three.jpg",
  },
  {
    id: "user-four",
    username: "UserFour",
    role: "REGULAR",
    passwordEnvVar: "PASSWORD_USER4",
    avatarAsset: "avatars/user-four.jpg",
  },
];

// Example album data. Customize this with the albums you want to create.
// coverImage and user.image should store paths relative to the upload root.
const albumsToCreate = [
  {
    id: "birthday-party-2025",
    name: "Birthday Party 2025",
    infoText: "So fun",
    category: "SPILLEAFTEN",
    coverAsset: "covers/party-2025.jpg",
  },
  {
    id: "summer-vacation-2024",
    name: "Summer Vacation 2024",
    infoText: "A trip to the beach.",
    category: "REJSER",
    coverAsset: "covers/summer-2024.jpg",
  },
  {
    id: "winter-feast",
    name: "Winter Feast",
    infoText: "Winter Feast",
    category: "JULEFROKOST",
    coverAsset: "covers/winter-feast.jpg",
  },
];

function getUploadRoot() {
  const configured = process.env.UPLOAD_ROOT?.trim();
  return configured || "/uploads";
}

function resolveUploadPath(relativePath) {
  const resolvedPath = path.resolve(RESOLVED_UPLOAD_ROOT, relativePath);

  if (
    resolvedPath !== RESOLVED_UPLOAD_ROOT &&
    !resolvedPath.startsWith(`${RESOLVED_UPLOAD_ROOT}${path.sep}`)
  ) {
    throw new Error("Resolved path is outside of UPLOAD_ROOT.");
  }

  return resolvedPath;
}

function buildAlbumCoverRelativePath(albumId, extension) {
  return path.posix.join("albums", albumId, "cover", `${albumId}-cover${extension}`);
}

function buildUserAvatarRelativePath(userId, extension) {
  return path.posix.join("users", userId, "avatar", `${userId}-avatar${extension}`);
}

function getAssetExtension(assetRelativePath) {
  const extension = path.extname(assetRelativePath).toLowerCase();
  if (!extension) {
    throw new Error(`Seed asset missing file extension: ${assetRelativePath}`);
  }
  return extension;
}

async function copySeedAsset(assetRelativePath, destinationRelativePath) {
  const sourcePath = path.resolve(SEED_ASSETS_ROOT, assetRelativePath);
  try {
    await stat(sourcePath);
  } catch (error) {
    throw new Error(`Missing seed asset: ${assetRelativePath}`);
  }

  const targetPath = resolveUploadPath(destinationRelativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });

  if (!SHOULD_OVERWRITE_ASSETS) {
    try {
      await stat(targetPath);
      return false;
    } catch (error) {
      // File does not exist yet.
    }
  }

  await copyFile(sourcePath, targetPath);
  return true;
}

async function main() {
  console.log("Starting the seed script...");

  // Create users with unique passwords
  console.log("Creating users...");
  for (const userData of usersToCreate) {
    const password = process.env[userData.passwordEnvVar];

    if (!password) {
      console.error(
        `\nERROR: Password environment variable '${userData.passwordEnvVar}' for user '${userData.username}' is not set in your .env file.`,
      );
      console.error("Please add it and try again.\n");
      process.exit(1);
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
      select: { id: true },
    });
    const userId = existingUser?.id ?? userData.id;
    if (!userId) {
      throw new Error(`Missing deterministic ID for user: ${userData.username}`);
    }

    const avatarExtension = userData.avatarAsset
      ? getAssetExtension(userData.avatarAsset)
      : "";
    const avatarRelativePath = userData.avatarAsset
      ? buildUserAvatarRelativePath(userId, avatarExtension)
      : null;

    if (userData.avatarAsset && avatarRelativePath) {
      const copied = await copySeedAsset(userData.avatarAsset, avatarRelativePath);
      if (copied) {
        console.log(`  - Copied avatar for ${userData.username}`);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {
        hashedPassword,
        role: userData.role,
        image: avatarRelativePath,
      },
      create: {
        id: userId,
        username: userData.username,
        hashedPassword,
        role: userData.role,
        image: avatarRelativePath,
      },
    });
    console.log(`  - Created/updated user: ${user.username} (ID: ${user.id})`);
  }

  // Create albums
  console.log("\nCreating/updating albums...");
  for (const albumData of albumsToCreate) {
    const existingAlbum = await prisma.album.findUnique({
      where: { name: albumData.name },
      select: { id: true },
    });
    const albumId = existingAlbum?.id ?? albumData.id;
    if (!albumId) {
      throw new Error(`Missing deterministic ID for album: ${albumData.name}`);
    }

    const coverExtension = albumData.coverAsset
      ? getAssetExtension(albumData.coverAsset)
      : "";
    const coverRelativePath = albumData.coverAsset
      ? buildAlbumCoverRelativePath(albumId, coverExtension)
      : null;

    if (albumData.coverAsset && coverRelativePath) {
      const copied = await copySeedAsset(albumData.coverAsset, coverRelativePath);
      if (copied) {
        console.log(`  - Copied cover for ${albumData.name}`);
      }
    }

    const album = await prisma.album.upsert({
      where: { name: albumData.name },
      update: {
        name: albumData.name,
        infoText: albumData.infoText,
        category: albumData.category,
        coverImage: coverRelativePath,
      },
      create: {
        id: albumId,
        name: albumData.name,
        infoText: albumData.infoText,
        category: albumData.category,
        coverImage: coverRelativePath,
      },
    });
    console.log(`  - Created/updated album: ${album.name} (ID: ${album.id})`);
  }

  console.log("\nSeeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("An error occurred during seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Disconnecting Prisma Client...");
    await prisma.$disconnect();
  });
