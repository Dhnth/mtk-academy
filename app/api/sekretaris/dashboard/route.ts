import { NextResponse } from "next/server";
import { query, getFirstRow, getRows } from "@/lib/db";
import { auth } from "@/auth";

interface ProfileRow {
  id: string;
  username: string;
  name: string;
  role: string;
  class_id: string | null;
  class_name: string | null;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
}

interface ClassSummaryRow {
  id: string;
  name: string;
  studentCount: number;
  totalIncome: number;
  totalExpense: number;
}

interface AttendanceRow {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  disPen: number;
}

interface MemberCountRow {
  count: number;
}

interface ActivityRow {
  type: string;
  message: string;
  created_at: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 1. Get user profile
    const profileResult = await query<ProfileRow>(
      `SELECT 
        u.id,
        u.username,
        u.name,
        u.role,
        u.class_id,
        c.name as class_name,
        u.level,
        u.exp,
        u.income,
        u.expense,
        u.wins,
        u.losses
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = $1`,
      [userId]
    );

    const profile = getFirstRow(profileResult);

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 2. Get class summary (include all members: STUDENT + SECRETARY)
    let classSummary: Array<{
      id: string;
      name: string;
      studentCount: number;
      totalIncome: number;
      totalExpense: number;
    }> = [];

    if (profile.class_id) {
      const classSummaryResult = await query<ClassSummaryRow>(
        `SELECT 
          c.id,
          c.name,
          COUNT(u.id) as studentCount,
          COALESCE(SUM(u.income), 0) as totalIncome,
          COALESCE(SUM(u.expense), 0) as totalExpense
        FROM classes c
        LEFT JOIN users u ON u.class_id = c.id AND u.role IN ('STUDENT', 'SECRETARY')
        WHERE c.id = $1
        GROUP BY c.id, c.name`,
        [profile.class_id]
      );
      classSummary = getRows(classSummaryResult).map((row) => ({
        id: row.id,
        name: row.name,
        studentCount: Number(row.studentCount || 0),
        totalIncome: Number(row.totalIncome || 0),
        totalExpense: Number(row.totalExpense || 0),
      }));
    }

    // 3. Get today's attendance for the class (include STUDENT + SECRETARY)
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = {
      total: 0,
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      disPen: 0,
    };

    if (profile.class_id) {
      const attendanceResult = await query<AttendanceRow>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) as hadir,
          SUM(CASE WHEN status = 'IZIN' THEN 1 ELSE 0 END) as izin,
          SUM(CASE WHEN status = 'SAKIT' THEN 1 ELSE 0 END) as sakit,
          SUM(CASE WHEN status = 'ALPHA' THEN 1 ELSE 0 END) as alpha,
          SUM(CASE WHEN status = 'DIS PEN' THEN 1 ELSE 0 END) as disPen
        FROM attendances
        WHERE class_id = $1 AND date = $2`,
        [profile.class_id, today]
      );

      // Count total members (STUDENT + SECRETARY)
      const memberCountResult = await query<MemberCountRow>(
        "SELECT COUNT(*) as count FROM users WHERE class_id = $1 AND role IN ('STUDENT', 'SECRETARY')",
        [profile.class_id]
      );

      const attRow = getFirstRow(attendanceResult);
      const memberRow = getFirstRow(memberCountResult);
      todayAttendance.total = Number(memberRow?.count || 0);
      todayAttendance.hadir = Number(attRow?.hadir || 0);
      todayAttendance.izin = Number(attRow?.izin || 0);
      todayAttendance.sakit = Number(attRow?.sakit || 0);
      todayAttendance.alpha = Number(attRow?.alpha || 0);
      todayAttendance.disPen = Number(attRow?.disPen || 0);
    }

    // 4. Get recent activities
    const activitiesResult = await query<ActivityRow>(
      `SELECT 
        'attendance' as type,
        CONCAT('Absensi hari ini: ', 
          CASE 
            WHEN status = 'HADIR' THEN 'Hadir'
            WHEN status = 'IZIN' THEN 'Izin'
            WHEN status = 'SAKIT' THEN 'Sakit'
            WHEN status = 'ALPHA' THEN 'Alpha'
            WHEN status = 'DIS PEN' THEN 'Dispen'
            ELSE 'Belum'
          END
        ) as message,
        created_at
      FROM attendances
      WHERE created_by = $1
      ORDER BY created_at DESC
      LIMIT 3`,
      [userId]
    );

    const activitiesRows = getRows(activitiesResult);
    let recentActivities = activitiesRows.map((row, index) => ({
      id: `act-${Date.now()}-${index}`,
      type: row.type,
      message: row.message,
      created_at: row.created_at,
    }));

    if (recentActivities.length === 0) {
      recentActivities = [
        {
          id: `act-${Date.now()}-0`,
          type: "info",
          message: "Selamat datang di dashboard sekretaris!",
          created_at: new Date().toISOString(),
        },
      ];
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        role: profile.role,
        class_id: profile.class_id,
        class_name: profile.class_name,
        level: Number(profile.level || 1),
        exp: Number(profile.exp || 0),
        income: Number(profile.income || 0),
        expense: Number(profile.expense || 0),
        wins: Number(profile.wins || 0),
        losses: Number(profile.losses || 0),
      },
      classSummary,
      todayAttendance,
      recentActivities,
    });
  } catch (error) {
    console.error("Error fetching sekretaris dashboard:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}