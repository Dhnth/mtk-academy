import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password minimal 4 karakter" },
        { status: 400 }
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await query(
        "UPDATE users SET password = $1 WHERE id = $2",
        [hashedPassword, userId]
      );

      return NextResponse.json({
        message: "Password berhasil diubah",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return NextResponse.json(
        { error: "Gagal mengubah password" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}