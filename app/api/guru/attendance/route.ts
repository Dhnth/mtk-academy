import { NextRequest, NextResponse } from "next/server";
import { query, getRows } from "@/lib/db";

interface AttendanceRow {
  id: string;
  student_id: string;
  student_name: string;
  student_username: string;
  class_id: string;
  class_name: string;
  status: string;
  created_at: string;
}

// GET - Ambil data kehadiran untuk guru (semua kelas)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Ambil semua data kehadiran hari ini dengan informasi siswa dan kelas
    const attendanceResult = await query<AttendanceRow>(
      `SELECT 
        a.id,
        a.student_id,
        u.name as student_name,
        u.username as student_username,
        a.class_id,
        c.name as class_name,
        a.status,
        a.created_at
      FROM attendances a
      JOIN users u ON a.student_id = u.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.date = $1
      ORDER BY c.name ASC, u.name ASC`,
      [date]
    );

    return NextResponse.json(getRows(attendanceResult));
  } catch (error) {
    console.error("Error fetching attendance for guru:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kehadiran" },
      { status: 500 }
    );
  }
}