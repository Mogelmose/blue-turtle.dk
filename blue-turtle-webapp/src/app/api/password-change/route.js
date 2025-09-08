import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sessionAuthOptions as authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { changePasswordSchema } from "@/lib/PasswordSchema";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request data
    const validatedData = changePasswordSchema.parse(body);
    const { currentPassword, newPassword } = validatedData;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, hashedPassword: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.hashedPassword
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.hashedPassword);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword: newHashedPassword }
    });

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    // Log error for debugging (never log passwords)
    console.error("Password change error:", {
      userId: session?.user?.id,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}