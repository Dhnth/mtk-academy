import { NextResponse } from "next/server";
import { query, getRows } from "@/lib/db";
import { auth } from "@/auth";

interface MatchHistoryRow {
  id: string;
  match_type: string;
  created_at: string;
  opponent_name: string;
  result: string;
  exp_change: number;
  money_change: number;
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

    // Get match history where user participated
    const result = await query<MatchHistoryRow>(
      `SELECT 
        m.id,
        m.match_type,
        m.created_at,
        CASE 
          WHEN m.match_type = 'SOLO' THEN
            CASE 
              WHEN m.player1_id = $1 THEN u2.name
              ELSE u1.name
            END
          ELSE
            CASE 
              WHEN m.player1_id = $1 THEN t2.name
              ELSE t1.name
            END
        END as opponent_name,
        CASE 
          WHEN m.winner_id = $1 THEN 'WIN'
          WHEN m.winner_id IS NULL THEN 'DRAW'
          ELSE 'LOSE'
        END as result,
        mr.exp_change,
        mr.money_change
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id AND m.match_type = 'SOLO'
      LEFT JOIN users u2 ON m.player2_id = u2.id AND m.match_type = 'SOLO'
      LEFT JOIN teams t1 ON m.player1_id = t1.id AND m.match_type = 'TEAM'
      LEFT JOIN teams t2 ON m.player2_id = t2.id AND m.match_type = 'TEAM'
      JOIN match_rewards mr ON m.id = mr.match_id AND mr.player_id = $1
      WHERE m.status = 'COMPLETED' 
        AND (m.player1_id = $1 OR m.player2_id = $1)
      ORDER BY m.created_at DESC
      LIMIT 20`,
      [userId]
    );

    return NextResponse.json(getRows(result));
  } catch (error) {
    console.error("Error fetching match history:", error);
    return NextResponse.json(
      { error: "Gagal mengambil riwayat battle" },
      { status: 500 }
    );
  }
}