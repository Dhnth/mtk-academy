import { NextResponse } from "next/server";
import { query, getRows, getFirstRow } from "@/lib/db";

// Tipe data untuk response
interface Stats {
  totalStudents: number;
  activeUnitsCount: number;
  totalIncome: number;
  totalExpense: number;
}

interface Company {
  id: string;
  name: string;
  category: string;
  balance: number;
  studentCount: number;
  status: string;
  iconType: string;
}

interface ActiveSession {
  id: string;
  className: string;
  module: string;
  progressPercent: number;
  activeStudentCount: number;
}

interface StudentData {
  id: string;
  name: string;
  username: string;
  class_id: string | null;
  income: number;
  expense: number;
}

interface DashboardData {
  stats: Stats;
  companies: Company[];
  activeSessions: ActiveSession[];
  topStudents: StudentData[];
}

interface StatsRow {
  totalStudents: number;
  totalIncome: number;
  totalExpense: number;
}

interface ClassRow {
  id: string;
  name: string;
  studentCount: number;
  totalIncome: number;
  totalExpense: number;
}

interface MatchRow {
  id: string;
  className: string | null;
  activeStudentCount: number;
  match_type: string;
}

interface StudentRow {
  id: string;
  name: string;
  username: string;
  class_id: string | null;
  income: number;
  expense: number;
}

export async function GET() {
  try {
    // 1. GET TOTAL STUDENTS & STATS (include STUDENT and SECRETARY)
    const statsResult = await query<StatsRow>(
      `SELECT 
        COUNT(*) as totalStudents,
        COALESCE(SUM(income), 0) as totalIncome,
        COALESCE(SUM(expense), 0) as totalExpense
      FROM users 
      WHERE role IN ('STUDENT', 'SECRETARY')`
    );

    const statsRow = getFirstRow(statsResult);
    const totalStudents = Number(statsRow?.totalStudents || 0);
    const totalIncome = Number(statsRow?.totalIncome || 0);
    const totalExpense = Number(statsRow?.totalExpense || 0);

    // 2. GET ACTIVE UNITS (Classes with students)
    const classResult = await query<ClassRow>(
      `SELECT 
        c.id,
        c.name,
        COUNT(u.id) as studentCount,
        COALESCE(SUM(u.income), 0) as totalIncome,
        COALESCE(SUM(u.expense), 0) as totalExpense
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role IN ('STUDENT', 'SECRETARY')
      GROUP BY c.id, c.name
      ORDER BY studentCount DESC`
    );

    const classRows = getRows(classResult);
    const activeUnitsCount = classRows.length;

    // 3. GET COMPANIES (Classes with detailed data - REAL DATA)
    const companies: Company[] = classRows.map((row) => {
      const studentCount = Number(row.studentCount || 0);
      const rowTotalIncome = Number(row.totalIncome || 0);
      const rowTotalExpense = Number(row.totalExpense || 0);
      const balance = rowTotalIncome - rowTotalExpense < 0 ? 0 : rowTotalIncome - rowTotalExpense;
      
      return {
        id: row.id,
        name: row.name,
        category: "Training Unit",
        balance: balance,
        studentCount: studentCount,
        status: studentCount > 0 ? "AKTIF" : "NONAKTIF",
        iconType: studentCount > 10 ? "zap" : "database",
      };
    });

    // 4. GET ACTIVE SESSIONS (Ongoing matches)
    const matchResult = await query<MatchRow>(
      `SELECT 
        m.id,
        m.match_type,
        c.name as className,
        COUNT(DISTINCT CASE WHEN m.player1_id IS NOT NULL THEN m.player1_id END) + 
        COUNT(DISTINCT CASE WHEN m.player2_id IS NOT NULL THEN m.player2_id END) as activeStudentCount
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id
      LEFT JOIN classes c ON u1.class_id = c.id
      WHERE m.status IN ('PENDING', 'ONGOING')
      GROUP BY m.id, m.match_type, c.name
      ORDER BY m.created_at DESC
      LIMIT 5`
    );

    const matchRows = getRows(matchResult);
    const activeSessions: ActiveSession[] = matchRows.map((row) => {
      const progress = Math.floor(Math.random() * 40) + 30; // 30-70%
      return {
        id: row.id,
        className: row.className || "Multi-Class",
        module: row.match_type === "TEAM" ? "Team Battle" : "Solo Duel",
        progressPercent: progress,
        activeStudentCount: Number(row.activeStudentCount || 2),
      };
    });

    // 5. GET TOP STUDENTS (by net income) - include STUDENT and SECRETARY
    const studentResult = await query<StudentRow>(
      `SELECT 
        id,
        name,
        username,
        class_id,
        income,
        expense
      FROM users
      WHERE role IN ('STUDENT', 'SECRETARY')
      ORDER BY (income - expense) DESC
      LIMIT 5`
    );

    const studentRows = getRows(studentResult);
    const topStudents: StudentData[] = studentRows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      class_id: row.class_id,
      income: Number(row.income || 0),
      expense: Number(row.expense || 0),
    }));

    // Build response
    const dashboardData: DashboardData = {
      stats: {
        totalStudents,
        activeUnitsCount,
        totalIncome,
        totalExpense,
      },
      companies,
      activeSessions,
      topStudents,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}