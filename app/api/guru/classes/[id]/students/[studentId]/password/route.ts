import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRowCount } from "@/lib/db";
import bcrypt from "bcryptjs";

interface StudentRow {
  id: string;
}

// PATCH - Ganti password siswa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;
    const body = await request.json();
    const { password } = body;

    if (!id || !studentId) {
      return NextResponse.json(
        { error: "ID kelas dan ID siswa wajib diisi" },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password minimal 4 karakter" },
        { status: 400 }
      );
    }

    // Cek apakah siswa ada di kelas ini
    const studentResult = await query<StudentRow>(
      "SELECT id FROM users WHERE id = $1 AND class_id = $2",
      [studentId, id]
    );

    if (getRowCount(studentResult) === 0) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan di kelas ini" },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, studentId]
    );

    return NextResponse.json({
      message: "Password berhasil diubah",
      password: password,
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "Gagal mengubah password" },
      { status: 500 }
    );
  }
}