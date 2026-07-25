import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRows } from "@/lib/db";

interface StudentDetail {
  id: string;
  name: string;
  username: string;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

interface ClassDetailRow {
  id: string;
  name: string;
  created_at: string;
}

interface StudentRow {
  id: string;
  name: string;
  username: string;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

interface ClassDetail {
  id: string;
  name: string;
  createdAt: string;
  students: StudentDetail[];
  stats: {
    totalStudents: number;
    totalIncome: number;
    totalExpense: number;
    averageLevel: number;
  };
}

// GET - Ambil detail kelas berdasarkan ID
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

    // Ambil data kelas
    const classResult = await query<ClassDetailRow>(
      "SELECT id, name, created_at FROM classes WHERE id = $1",
      [id]
    );

    const classData = getFirstRow(classResult);

    if (!classData) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil data siswa di kelas ini
    const studentsResult = await query<StudentRow>(
      `SELECT 
        id,
        name,
        username,
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

    const students = getRows(studentsResult);
    const studentList: StudentDetail[] = students.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      level: Number(row.level || 1),
      exp: Number(row.exp || 0),
      income: Number(row.income || 0),
      expense: Number(row.expense || 0),
      wins: Number(row.wins || 0),
      losses: Number(row.losses || 0),
      created_at: row.created_at,
    }));

    // Hitung statistik
    const totalStudents = studentList.length;
    const totalIncome = studentList.reduce((sum, s) => sum + s.income, 0);
    const totalExpense = studentList.reduce((sum, s) => sum + s.expense, 0);
    const averageLevel = totalStudents > 0
      ? Math.round(studentList.reduce((sum, s) => sum + s.level, 0) / totalStudents)
      : 0;

    const response: ClassDetail = {
      id: classData.id,
      name: classData.name,
      createdAt: classData.created_at,
      students: studentList,
      stats: {
        totalStudents,
        totalIncome,
        totalExpense,
        averageLevel,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching class detail:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail kelas" },
      { status: 500 }
    );
  }
}