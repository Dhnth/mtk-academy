import { NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "SECRETARY" | "STUDENT";
  class_id: string | null;
  income: number;
  expense: number;
}

export async function GET() {
  try {
    // 1. Dapatkan session dari NextAuth
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau belum login" },
        { status: 401 }
      );
    }

    // 2. Ambil data user dari database berdasarkan user ID di session
    const result = await query<UserRow>(
      `SELECT id, name, username, role, class_id, income, expense 
       FROM users 
       WHERE id = $1`,
      [session.user.id]
    );

    const user = getFirstRow(result);

    if (!user) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3. Kembalikan data user ke client
    return NextResponse.json(user);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}