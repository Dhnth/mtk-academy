import { NextRequest, NextResponse } from "next/server";
import { query, getRows } from "@/lib/db";
import { auth } from "@/auth";

interface AttendanceRow {
  id: string;
  student_id: string;
  student_name: string;
  student_username: string;
  class_id: string;
  class_name: string;
  status: string;
  created_at: string;
  date: string;
}

// GET - Ambil data kehadiran untuk guru dengan filter tanggal
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // Default: hari ini
    const today = new Date().toISOString().split("T")[0];
    
    let dateFilter = "";
    let queryParams: string[] = [];
    
    if (startDate && endDate) {
      dateFilter = "WHERE a.date BETWEEN $1 AND $2";
      queryParams = [startDate, endDate];
    } else if (startDate) {
      dateFilter = "WHERE a.date = $1";
      queryParams = [startDate];
    } else {
      dateFilter = "WHERE a.date = $1";
      queryParams = [today];
    }

    const attendanceResult = await query<AttendanceRow>(
      `SELECT 
        a.id,
        a.student_id,
        u.name as student_name,
        u.username as student_username,
        a.class_id,
        c.name as class_name,
        a.status,
        a.created_at,
        a.date
      FROM attendances a
      JOIN users u ON a.student_id = u.id
      JOIN classes c ON a.class_id = c.id
      ${dateFilter}
      ORDER BY a.date ASC, c.name ASC, u.name ASC`,
      queryParams
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