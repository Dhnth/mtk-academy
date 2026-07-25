import { NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface UserRow {
  id: string;
  username: string;
  name: string;
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    try {
      const userResult = await query<UserRow>(
        `SELECT 
          u.id,
          u.username,
          u.name,
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
        WHERE u.id = $1`,
        [userId]
      );

      const user = getFirstRow(userResult);

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: user.id,
        username: user.username,
        name: user.name,
        level: Number(user.level || 1),
        exp: Number(user.exp || 0),
        income: Number(user.income || 0),
        expense: Number(user.expense || 0),
        wins: Number(user.wins || 0),
        losses: Number(user.losses || 0),
        class_id: user.class_id,
        class_name: user.class_name,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return NextResponse.json(
        { error: "Gagal mengambil profil" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}