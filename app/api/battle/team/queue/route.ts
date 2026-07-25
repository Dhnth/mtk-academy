import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface TeamMemberRow {
  team_id: string;
  captain_id: string;
  name: string;
  status: string;
}

interface QueueRow {
  id: string;
}

interface LevelRow {
  avg_level: number;
}

interface OpponentRow {
  team_id: string;
  avg_level: number;
}

interface QuestionRow {
  id: string;
}

// POST - Masuk antrian team battle
export async function POST() {
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
      // Cek apakah user berada di tim dan merupakan kapten
      const teamMembersResult = await query<TeamMemberRow>(
        `SELECT tm.team_id, t.captain_id, t.name, t.status 
         FROM team_members tm 
         JOIN teams t ON tm.team_id = t.id 
         WHERE tm.user_id = $1`,
        [userId]
      );

      const teamMember = getFirstRow(teamMembersResult);

      if (!teamMember) {
        return NextResponse.json(
          { error: "Anda tidak berada dalam tim manapun" },
          { status: 400 }
        );
      }

      const { team_id: teamId, captain_id: captainId, name: teamName, status: teamStatus } = teamMember;

      if (captainId !== userId) {
        return NextResponse.json(
          { error: "Hanya kapten tim yang dapat memulai matchmaking" },
          { status: 403 }
        );
      }

      if (teamStatus === "MATCHMAKING" || teamStatus === "IN_BATTLE") {
        return NextResponse.json(
          { error: "Tim Anda sedang berada dalam antrian atau pertempuran" },
          { status: 400 }
        );
      }

      // Cek apakah sudah terdaftar di queue
      const existingQueueResult = await query<QueueRow>(
        "SELECT id FROM team_queue WHERE team_id = $1",
        [teamId]
      );

      if (existingQueueResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Tim Anda sudah dalam antrian" },
          { status: 400 }
        );
      }

      // Dapatkan level rata-rata anggota tim
      const levelsResult = await query<LevelRow>(
        `SELECT AVG(u.level) as avg_level 
         FROM team_members tm 
         JOIN users u ON tm.user_id = u.id 
         WHERE tm.team_id = $1`,
        [teamId]
      );

      const levelData = getFirstRow(levelsResult);
      const avgLevel = Math.round(Number(levelData?.avg_level || 1));

      // Cari tim lawan dengan level rata-rata yang sama (±1)
      const opponentsResult = await query<OpponentRow>(
        `SELECT tq.team_id, tq.avg_level 
         FROM team_queue tq
         JOIN teams t ON tq.team_id = t.id
         WHERE tq.avg_level BETWEEN $1 AND $2
         AND tq.team_id != $3
         AND t.status = 'MATCHMAKING'
         ORDER BY ABS(tq.avg_level - $4) ASC, tq.joined_at ASC
         LIMIT 1`,
        [avgLevel - 1, avgLevel + 1, teamId, avgLevel]
      );

      if (opponentsResult.rows.length > 0) {
        // Dapatkan tim lawan!
        const opponent = opponentsResult.rows[0];
        const opponentTeamId = opponent.team_id;
        const opponentAvgLevel = Number(opponent.avg_level || 1);

        // Buat match baru (TEAM)
        const matchId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        await query(
          `INSERT INTO matches (id, player1_id, player2_id, match_type, status) 
           VALUES ($1, $2, $3, 'TEAM', 'ONGOING')`,
          [matchId, teamId, opponentTeamId]
        );

        // Cari soal pertama (round 1)
        const matchAvgLevel = Math.round((avgLevel + opponentAvgLevel) / 2);
        const questionsResult = await query<QuestionRow>(
          `SELECT id FROM questions WHERE level = $1 ORDER BY RAND() LIMIT 1`,
          [matchAvgLevel]
        );

        let questionId: string | null = null;
        if (questionsResult.rows.length > 0) {
          questionId = questionsResult.rows[0].id;
        } else {
          const fallbackResult = await query<QuestionRow>(
            `SELECT id FROM questions WHERE level = 1 ORDER BY RAND() LIMIT 1`
          );
          if (fallbackResult.rows.length > 0) {
            questionId = fallbackResult.rows[0].id;
          }
        }

        if (questionId) {
          const mqId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
          await query(
            `INSERT INTO match_questions (id, match_id, question_id, round, player1_answer, player2_answer, player1_time, player2_time, time_limit) 
             VALUES ($1, $2, $3, 1, NULL, NULL, NULL, NULL, 30)`,
            [mqId, matchId, questionId]
          );
        }

        // Hapus lawan dari queue
        await query(
          "DELETE FROM team_queue WHERE team_id = $1",
          [opponentTeamId]
        );

        // Update status kedua tim menjadi IN_BATTLE
        await query(
          "UPDATE teams SET status = 'IN_BATTLE' WHERE id IN ($1, $2)",
          [teamId, opponentTeamId]
        );

        // Trigger event ke kedua tim
        await pusherServer.trigger(`team-${teamId}`, "match-found", { matchId });
        await pusherServer.trigger(`team-${opponentTeamId}`, "match-found", { matchId });

        return NextResponse.json({
          message: "Lawan ditemukan!",
          matchId,
          opponentTeamId,
        });
      }

      // Tidak ada lawan, masuk antrian
      const queueId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await query(
        "INSERT INTO team_queue (id, team_id, avg_level) VALUES ($1, $2, $3)",
        [queueId, teamId, avgLevel]
      );

      // Update status tim menjadi MATCHMAKING
      await query(
        "UPDATE teams SET status = 'MATCHMAKING' WHERE id = $1",
        [teamId]
      );

      // Trigger event matchmaking started ke anggota tim
      await pusherServer.trigger(`team-${teamId}`, "matchmaking-started", { teamId });

      return NextResponse.json({
        message: "Masuk antrian",
        teamId,
        avgLevel,
      });
    } catch (error) {
      console.error("Error in team queue:", error);
      return NextResponse.json(
        { error: "Gagal masuk antrian" },
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