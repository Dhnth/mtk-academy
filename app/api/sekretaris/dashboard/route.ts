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
  studentcount: number;
  totalincome: number;
  totalexpense: number;
}

interface AttendanceRow {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  dispen: number;
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
    const profileResult = await query(
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

    const profile = getFirstRow(profileResult) as ProfileRow | null;

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // AUTO LEVEL UP
    const currentLevel = Number(profile.level || 1);
    const currentExp = Number(profile.exp || 0);
    let levelUp = false;
    let newLevel = currentLevel;
    let newExp = currentExp;

    let expNeeded = currentLevel * 100;
    let canLevelUp = currentExp >= expNeeded;

    while (canLevelUp) {
      newExp = newExp - expNeeded;
      newLevel = newLevel + 1;
      levelUp = true;
      
      expNeeded = newLevel * 100;
      canLevelUp = newExp >= expNeeded;
    }

    if (levelUp) {
      await query(
        "UPDATE users SET level = $1, exp = $2 WHERE id = $3",
        [newLevel, newExp, userId]
      );
    }

    // 2. Get class summary - pakai alias lowercase
    let classSummary: Array<{
      id: string;
      name: string;
      studentCount: number;
      totalIncome: number;
      totalExpense: number;
    }> = [];

    if (profile.class_id) {
      const classSummaryResult = await query(
        `SELECT 
          c.id,
          c.name,
          COUNT(u.id) as studentcount,
          COALESCE(SUM(u.income), 0) as totalincome,
          COALESCE(SUM(u.expense), 0) as totalexpense
        FROM classes c
        LEFT JOIN users u ON u.class_id = c.id AND u.role IN ('STUDENT', 'SECRETARY')
        WHERE c.id = $1
        GROUP BY c.id, c.name`,
        [profile.class_id]
      );
      
      const rows = getRows(classSummaryResult) as ClassSummaryRow[];
      classSummary = rows.map((row) => ({
        id: row.id,
        name: row.name,
        studentCount: Number(row.studentcount || 0),
        totalIncome: Number(row.totalincome || 0),
        totalExpense: Number(row.totalexpense || 0),
      }));
    }

    // 3. Get today's attendance - pakai alias lowercase
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
      const attendanceResult = await query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) as hadir,
          SUM(CASE WHEN status = 'IZIN' THEN 1 ELSE 0 END) as izin,
          SUM(CASE WHEN status = 'SAKIT' THEN 1 ELSE 0 END) as sakit,
          SUM(CASE WHEN status = 'ALPHA' THEN 1 ELSE 0 END) as alpha,
          SUM(CASE WHEN status = 'DIS PEN' THEN 1 ELSE 0 END) as dispen
        FROM attendances
        WHERE class_id = $1 AND date = $2`,
        [profile.class_id, today]
      );

      const memberCountResult = await query(
        "SELECT COUNT(*) as count FROM users WHERE class_id = $1 AND role IN ('STUDENT', 'SECRETARY')",
        [profile.class_id]
      );

      const attRow = getFirstRow(attendanceResult) as AttendanceRow | null;
      const memberRow = getFirstRow(memberCountResult) as MemberCountRow | null;
      
      todayAttendance.total = Number(memberRow?.count || 0);
      todayAttendance.hadir = Number(attRow?.hadir || 0);
      todayAttendance.izin = Number(attRow?.izin || 0);
      todayAttendance.sakit = Number(attRow?.sakit || 0);
      todayAttendance.alpha = Number(attRow?.alpha || 0);
      todayAttendance.disPen = Number(attRow?.dispen || 0);
    }

    // 4. Get recent activities
    const activitiesResult = await query(
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

    const activitiesRows = getRows(activitiesResult) as ActivityRow[];
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
        level: newLevel,
        exp: newExp,
        income: Number(profile.income || 0),
        expense: Number(profile.expense || 0),
        wins: Number(profile.wins || 0),
        losses: Number(profile.losses || 0),
      },
      classSummary,
      todayAttendance,
      recentActivities,
      levelUp,
    });
  } catch (error) {
    console.error("Error fetching sekretaris dashboard:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}