import { NextResponse } from "next/server";
import { query, getRows } from "@/lib/db";

interface HallOfFameUserRow {
  id: string;
  name: string;
  username: string;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  class_id: string | null;
  class_name: string | null;
}

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.username,
        u.level,
        u.exp,
        u.income,
        u.expense,
        u.wins,
        u.losses,
        u.class_id,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.role IN ('STUDENT', 'SECRETARY')
      ORDER BY u.level DESC, u.exp DESC`
    );

    const users = getRows(result) as HallOfFameUserRow[];

    return NextResponse.json(users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      level: Number(user.level || 1),
      exp: Number(user.exp || 0),
      income: Number(user.income || 0),
      expense: Number(user.expense || 0),
      wins: Number(user.wins || 0),
      losses: Number(user.losses || 0),
      class_id: user.class_id,
      class_name: user.class_name,
    })));
  } catch (error) {
    console.error("Error fetching hall of fame:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data hall of fame" },
      { status: 500 }
    );
  }
}