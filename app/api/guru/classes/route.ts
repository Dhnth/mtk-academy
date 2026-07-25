import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ClassRow {
  id: string;
  name: string;
  created_at: string;
  studentcount: string | number;
  totalincome: string | number;
  totalexpense: string | number;
}

interface ClassResponse {
  id: string;
  name: string;
  studentCount: number;
  totalIncome: number;
  totalExpense: number;
  createdAt: string;
}

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        c.id,
        c.name,
        c.created_at,
        COUNT(u.id) as studentcount,
        COALESCE(SUM(u.income), 0) as totalincome,
        COALESCE(SUM(u.expense), 0) as totalexpense
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role IN ('STUDENT', 'SECRETARY')
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.created_at DESC`
    );

    const rows = result.rows as ClassRow[];
    
    const classes: ClassResponse[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      studentCount: Number(row.studentcount || 0),
      totalIncome: Number(row.totalincome || 0),
      totalExpense: Number(row.totalexpense || 0),
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kelas" },
      { status: 500 }
    );
  }
}

// POST - Buat kelas baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Nama kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Cek apakah nama kelas sudah ada
    const existingResult = await query(
      "SELECT id FROM classes WHERE name = $1",
      [name.trim()]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Nama kelas sudah digunakan" },
        { status: 409 }
      );
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

    await query(
      "INSERT INTO classes (id, name) VALUES ($1, $2)",
      [id, name.trim()]
    );

    return NextResponse.json(
      { message: "Kelas berhasil dibuat", id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Gagal membuat kelas" },
      { status: 500 }
    );
  }
}

// PUT - Update kelas
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Nama kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Cek apakah kelas exist
    const existingResult = await query(
      "SELECT id FROM classes WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah nama sudah digunakan oleh kelas lain
    const nameExistsResult = await query(
      "SELECT id FROM classes WHERE name = $1 AND id != $2",
      [name.trim(), id]
    );

    if (nameExistsResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Nama kelas sudah digunakan" },
        { status: 409 }
      );
    }

    await query(
      "UPDATE classes SET name = $1 WHERE id = $2",
      [name.trim(), id]
    );

    return NextResponse.json(
      { message: "Kelas berhasil diperbarui" }
    );
  } catch (error) {
    console.error("Error updating class:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kelas" },
      { status: 500 }
    );
  }
}

// DELETE - Hapus kelas
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Cek apakah kelas exist
    const existingResult = await query(
      "SELECT id FROM classes WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah ada siswa di kelas ini
    const studentsResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE class_id = $1 AND role IN ('STUDENT', 'SECRETARY')",
      [id]
    );

    const countRow = studentsResult.rows[0] as { count: string | number } | undefined;
    const count = Number(countRow?.count || 0);

    if (count > 0) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus kelas yang memiliki karyawan" },
        { status: 409 }
      );
    }

    await query("DELETE FROM classes WHERE id = $1", [id]);

    return NextResponse.json(
      { message: "Kelas berhasil dihapus" }
    );
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kelas" },
      { status: 500 }
    );
  }
}