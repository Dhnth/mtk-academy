import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRowCount } from "@/lib/db";

interface StudentRow {
  id: string;
}

// DELETE - Hapus siswa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;

    if (!id || !studentId) {
      return NextResponse.json(
        { error: "ID kelas dan ID siswa wajib diisi" },
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

    await query("DELETE FROM users WHERE id = $1", [studentId]);

    return NextResponse.json(
      { message: "Siswa berhasil dihapus" }
    );
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Gagal menghapus siswa" },
      { status: 500 }
    );
  }
}

// PUT - Update role siswa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!id || !studentId) {
      return NextResponse.json(
        { error: "ID kelas dan ID siswa wajib diisi" },
        { status: 400 }
      );
    }

    if (!role || !["STUDENT", "SECRETARY"].includes(role)) {
      return NextResponse.json(
        { error: "Role harus STUDENT atau SECRETARY" },
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

    await query(
      "UPDATE users SET role = $1 WHERE id = $2",
      [role, studentId]
    );

    return NextResponse.json(
      { message: "Role siswa berhasil diperbarui" }
    );
  } catch (error) {
    console.error("Error updating student role:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui role siswa" },
      { status: 500 }
    );
  }
}