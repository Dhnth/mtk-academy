import { NextRequest, NextResponse } from "next/server";
import { query, getRows, getRowCount } from "@/lib/db";
import bcrypt from "bcryptjs";

interface StudentRow {
  id: string;
  username: string;
  name: string;
  role: string;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

interface ExistingUserRow {
  id: string;
}

interface ClassExistsRow {
  id: string;
}

// GET - Ambil semua siswa di kelas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    const studentsResult = await query<StudentRow>(
      `SELECT 
        id,
        username,
        name,
        role,
        level,
        exp,
        income,
        expense,
        wins,
        losses,
        created_at
      FROM users 
      WHERE class_id = $1 AND role IN ('STUDENT', 'SECRETARY')
      ORDER BY role DESC, name ASC`,
      [id]
    );

    return NextResponse.json(getRows(studentsResult));
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data siswa" },
      { status: 500 }
    );
  }
}

// POST - Tambah siswa baru
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, name, password, role } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: "Username, nama, dan password wajib diisi" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password minimal 4 karakter" },
        { status: 400 }
      );
    }

    // Cek apakah username sudah ada
    const existingResult = await query<ExistingUserRow>(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (getRowCount(existingResult) > 0) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 }
      );
    }

    // Cek apakah kelas exist
    const classExistsResult = await query<ClassExistsRow>(
      "SELECT id FROM classes WHERE id = $1",
      [id]
    );

    if (getRowCount(classExistsResult) === 0) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    const userId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users 
        (id, username, password, name, role, class_id, level, exp, income, expense, wins, losses) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        userId,
        username,
        hashedPassword,
        name,
        role || "STUDENT",
        id,
        1,
        0,
        0,
        0,
        0,
        0,
      ]
    );

    return NextResponse.json(
      { message: "Siswa berhasil ditambahkan", id: userId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan siswa" },
      { status: 500 }
    );
  }
}