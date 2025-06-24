/**
 * =================================================================================
 * TEMPLATE SEED SCRIPT
 * =================================================================================
 *
 * This script is a template for seeding your database with initial data.
 * It supports unique passwords for every user by reading them from environment variables.
 *
 * HOW TO USE:
 * 1. Create a `.env` file in the root of your project.
 * 2. For EACH user you define below, add a corresponding password variable to your .env file:
 *    PASSWORD_ADMIN="your_admin_password"
 *    PASSWORD_USER1="user_one_password"
 *    PASSWORD_USER2="another_password"
 *    ...
 * 3. Copy this file's content into `prisma/seed.js`.
 * 4. Customize the `usersToCreate` and `albumsToCreate` arrays below with your own data.
 * 5. Run `npx prisma db seed` to populate your database.
 *
 * IMPORTANT: `prisma/seed.js` should be in your .gitignore file!
 *
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// To create 1 admin and 4 regular users, your array should look like this.
// For each user, specify their username, role, and the EXACT name of the
// environment variable that holds their password.
const usersToCreate = [
  { username: 'AdminUser',   role: 'ADMIN',   passwordEnvVar: 'PASSWORD_ADMIN' },
  { username: 'UserOne',     role: 'REGULAR', passwordEnvVar: 'PASSWORD_USER1' },
  { username: 'UserTwo',     role: 'REGULAR', passwordEnvVar: 'PASSWORD_USER2' },
  { username: 'UserThree',   role: 'REGULAR', passwordEnvVar: 'PASSWORD_USER3' },
  { username: 'UserFour',    role: 'REGULAR', passwordEnvVar: 'PASSWORD_USER4' },
];

// Example album data. Customize this with the albums you want to create.
const albumsToCreate = [
  { id: 'bday25', name: 'Birthday Party 2025', infoText: 'so fun', category: 'SPILLEAFTEN', coverImage: '/uploads/covers/example.jpg' },
  { id: 'summer24', name: 'Summer Vacation 2024', infoText: 'A trip to the beach.', category: 'REJSER' },
  { id: 'julefrokost', name: 'Julefrokost', infoText: 'Julefrokost', category: 'JULEFROKOST', coverImage: '/uploads/covers/example.jpg' },
];

async function main() {
  console.log('Starting the seed script...');

  // Create users with unique passwords
  console.log('Creating users...');
  for (const userData of usersToCreate) {
    const password = process.env[userData.passwordEnvVar];

    if (!password) {
      console.error(`\nERROR: Password environment variable '${userData.passwordEnvVar}' for user '${userData.username}' is not set in your .env file.`);
      console.error('Please add it and try again.\n');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
      },
    });
    console.log(`  - Created/updated user: ${user.username} (ID: ${user.id})`);
  }

  // Create albums
  console.log('\nCreating albums...');
  for (const albumData of albumsToCreate) {
    const album = await prisma.album.upsert({
      where: { id: albumData.id },
      update: {
        name: albumData.name,
        infoText: albumData.infoText,
        category: albumData.category,
        coverImage: albumData.coverImage,
      },
      create: {
        id: albumData.id,
        name: albumData.name,
        infoText: albumData.infoText,
        category: albumData.category,
        coverImage: albumData.coverImage,
      },
    });
    console.log(`  - Created/updated album: ${album.name} (ID: ${album.id})`);
  }

  console.log('\nSeeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Disconnecting Prisma Client...');
    await prisma.$disconnect();
  });