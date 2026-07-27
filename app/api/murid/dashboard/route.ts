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
  studentCount: string | number;
  totalIncome: string | number;
  totalExpense: string | number;
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

    // Get user profile
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
    // Level N → Level N+1: Butuh (Level N * 100) EXP
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

    // Get class summary
    let classSummary: ClassSummaryRow[] = [];

    if (profile.class_id) {
      const classDetailResult = await query(
        `SELECT id, name FROM classes WHERE id = $1`,
        [profile.class_id]
      );

      const classDetail = getFirstRow(classDetailResult) as { id: string; name: string } | null;

      if (classDetail) {
        const usersInClassResult = await query(
          `SELECT 
            COUNT(*) as total_count, 
            COALESCE(SUM(income), 0) as total_income, 
            COALESCE(SUM(expense), 0) as total_expense
          FROM users
          WHERE class_id = $1`,
          [profile.class_id]
        );

        const usersData = getFirstRow(usersInClassResult) as { 
          total_count: string | number; 
          total_income: string | number; 
          total_expense: string | number 
        } | null;

        classSummary = [{
          id: classDetail.id,
          name: classDetail.name,
          studentCount: Number(usersData?.total_count || 0),
          totalIncome: Number(usersData?.total_income || 0),
          totalExpense: Number(usersData?.total_expense || 0),
        }];
      }
    }

    if (classSummary.length === 0) {
      const userClassResult = await query(
        `SELECT class_id FROM users WHERE id = $1`,
        [userId]
      );
      const userClass = getFirstRow(userClassResult) as { class_id: string | null } | null;

      if (userClass?.class_id) {
        const classDetailResult = await query(
          `SELECT id, name FROM classes WHERE id = $1`,
          [userClass.class_id]
        );
        const classDetail = getFirstRow(classDetailResult) as { id: string; name: string } | null;

        if (classDetail) {
          const usersInClassResult = await query(
            `SELECT 
              COUNT(*) as total_count, 
              COALESCE(SUM(income), 0) as total_income, 
              COALESCE(SUM(expense), 0) as total_expense
            FROM users
            WHERE class_id = $1`,
            [userClass.class_id]
          );

          const usersData = getFirstRow(usersInClassResult) as { 
            total_count: string | number; 
            total_income: string | number; 
            total_expense: string | number 
          } | null;

          classSummary = [{
            id: classDetail.id,
            name: classDetail.name,
            studentCount: Number(usersData?.total_count || 0),
            totalIncome: Number(usersData?.total_income || 0),
            totalExpense: Number(usersData?.total_expense || 0),
          }];
        }
      }
    }

    // Get recent activities
    const activitiesResult = await query(
      `SELECT 
        'match' as type,
        CASE 
          WHEN m.winner_id = $1 THEN CONCAT('Menang duel vs ', 
            CASE 
              WHEN m.player1_id = $1 THEN u2.name
              ELSE u1.name
            END
          )
          ELSE CONCAT('Kalah duel vs ',
            CASE 
              WHEN m.player1_id = $1 THEN u2.name
              ELSE u1.name
            END
          )
        END as message,
        m.created_at
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id
      LEFT JOIN users u2 ON m.player2_id = u2.id
      WHERE (m.player1_id = $1 OR m.player2_id = $1) AND m.status = 'COMPLETED'
      ORDER BY m.created_at DESC
      LIMIT 3`,
      [userId]
    );

    const activityRows = getRows(activitiesResult) as ActivityRow[];
    const recentActivities = activityRows.map((row) => ({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: row.type,
      message: row.message,
      created_at: row.created_at,
    }));

    const profileResponse = {
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
    };

    return NextResponse.json({
      profile: profileResponse,
      classSummary: classSummary.map((cls) => ({
        id: cls.id,
        name: cls.name,
        studentCount: Number(cls.studentCount || 0),
        totalIncome: Number(cls.totalIncome || 0),
        totalExpense: Number(cls.totalExpense || 0),
      })),
      recentActivities,
      levelUp,
    });
  } catch (error) {
    console.error("Error fetching murid dashboard:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}