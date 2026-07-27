import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface MatchRow {
  id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  match_type: string;
  status: string;
  score1: number;
  score2: number;
  created_at: string;
  player1_name: string;
  player2_name: string;
  player1_level: number;
  player2_level: number;
  winner_name: string | null;
}

interface TeamMemberRow {
  user_id: string;
  user_name: string;
}

interface QuestionCountRow {
  total: number;
}

interface RewardRow {
  exp_change: number;
  money_change: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id: matchId } = await params;

    if (!matchId) {
      return NextResponse.json(
        { error: "ID match wajib diisi" },
        { status: 400 }
      );
    }

    try {
      // Get match data
      const matchResult = await query<MatchRow>(
        `SELECT 
          m.id,
          m.player1_id,
          m.player2_id,
          m.winner_id,
          m.match_type,
          m.status,
          m.score1,
          m.score2,
          m.created_at,
          COALESCE(u1.name, t1.name) as player1_name,
          COALESCE(u1.level, (SELECT ROUND(AVG(level)) FROM users WHERE id IN (SELECT user_id FROM team_members WHERE team_id = m.player1_id))) as player1_level,
          COALESCE(u2.name, t2.name) as player2_name,
          COALESCE(u2.level, (SELECT ROUND(AVG(level)) FROM users WHERE id IN (SELECT user_id FROM team_members WHERE team_id = m.player2_id))) as player2_level,
          COALESCE(w.name, wt.name) as winner_name
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id AND m.match_type = 'SOLO'
        LEFT JOIN users u2 ON m.player2_id = u2.id AND m.match_type = 'SOLO'
        LEFT JOIN teams t1 ON m.player1_id = t1.id AND m.match_type = 'TEAM'
        LEFT JOIN teams t2 ON m.player2_id = t2.id AND m.match_type = 'TEAM'
        LEFT JOIN users w ON m.winner_id = w.id AND m.match_type = 'SOLO'
        LEFT JOIN teams wt ON m.winner_id = wt.id AND m.match_type = 'TEAM'
        WHERE m.id = $1`,
        [matchId]
      );

      const match = getFirstRow(matchResult);

      if (!match) {
        return NextResponse.json(
          { error: "Match tidak ditemukan" },
          { status: 404 }
        );
      }

      // Check if user is participant
      let isPlayer1 = false;
      let isPlayer2 = false;
      let userTeamId: string | null = null;

      if (match.match_type === "SOLO") {
        isPlayer1 = match.player1_id === userId;
        isPlayer2 = match.player2_id === userId;
      } else {
        const p1MemberResult = await query<{ id: string }>(
          "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2",
          [match.player1_id, userId]
        );
        isPlayer1 = p1MemberResult.rows.length > 0;

        const p2MemberResult = await query<{ id: string }>(
          "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2",
          [match.player2_id, userId]
        );
        isPlayer2 = p2MemberResult.rows.length > 0;

        if (isPlayer1) userTeamId = match.player1_id;
        if (isPlayer2) userTeamId = match.player2_id;
      }

      if (!isPlayer1 && !isPlayer2) {
        return NextResponse.json(
          { error: "Anda tidak terlibat dalam match ini" },
          { status: 403 }
        );
      }

      // Get total rounds (questions count)
      const questionsResult = await query<QuestionCountRow>(
        "SELECT COUNT(*) as total FROM match_questions WHERE match_id = $1",
        [matchId]
      );
      const questions = getFirstRow(questionsResult);
      const totalRounds = Number(questions?.total || 5);

      // If match is completed, get exp and money changes
      let expChange = 0;
      let moneyChange = 0;
      let isWinner = false;

      if (match.status === "COMPLETED") {
        if (match.match_type === "SOLO") {
          isWinner = match.winner_id === userId;
        } else {
          isWinner = match.winner_id === userTeamId;
        }

        const changesResult = await query<RewardRow>(
          `SELECT exp_change, money_change 
           FROM match_rewards
           WHERE match_id = $1 AND player_id = $2`,
          [matchId, userId]
        );
        const changes = getFirstRow(changesResult);

        if (changes) {
          expChange = Number(changes.exp_change || 0);
          moneyChange = Number(changes.money_change || 0);
        }
      }

      // For TEAM matches: get ordered members for both teams
      let team1Members: { user_id: string; user_name: string }[] = [];
      let team2Members: { user_id: string; user_name: string }[] = [];

      if (match.match_type === "TEAM") {
        const t1Result = await query<TeamMemberRow>(
          `SELECT tm.user_id, u.name as user_name 
           FROM team_members tm JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`,
          [match.player1_id]
        );
        team1Members = t1Result.rows;

        const t2Result = await query<TeamMemberRow>(
          `SELECT tm.user_id, u.name as user_name 
           FROM team_members tm JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`,
          [match.player2_id]
        );
        team2Members = t2Result.rows;
      }

      // Hitung target_score berdasarkan level rata-rata
      const avgLevel = Math.round((Number(match.player1_level || 1) + Number(match.player2_level || 1)) / 2);
      const targetScore = 2 + avgLevel;

      return NextResponse.json({
        id: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        player1_name: match.player1_name,
        player2_name: match.player2_name,
        player1_level: Number(match.player1_level || 1),
        player2_level: Number(match.player2_level || 1),
        score1: Number(match.score1 || 0),
        score2: Number(match.score2 || 0),
        status: match.status,
        match_type: match.match_type,
        winner_id: match.winner_id,
        winner_name: match.winner_name,
        total_rounds: totalRounds,
        userId: userId,
        userTeamId,
        isPlayer1: isPlayer1,
        isWinner: isWinner,
        exp_change: expChange,
        money_change: moneyChange,
        team1Members,
        team2Members,
        target_score: targetScore,
      });
    } catch (error) {
      console.error("Error fetching match:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data match" },
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