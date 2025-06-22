import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get('file');
  const userId = data.get('userId');

  if (!file || !userId) {
    return NextResponse.json({ message: 'Missing file or userId' }, { status: 400 });
  }

  // Authorization check: allow if user is changing their own picture or is an admin
  const isCurrentUser = session.user.id === userId;
  const isAdmin = session.user.role === 'admin';

  if (!isCurrentUser && !isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if the user to be updated exists
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to prevent overwriting files
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const imagePath = path.join(process.cwd(), 'public/billeder', filename);
    
    // Save the file to the filesystem
    await writeFile(imagePath, buffer);

    const imageUrl = `/billeder/${filename}`;

    // Update the user's image path in the database
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    return NextResponse.json({ message: 'Image uploaded successfully', imageUrl });
  } catch (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json({ message: 'Image upload failed' }, { status: 500 });
  }
}
