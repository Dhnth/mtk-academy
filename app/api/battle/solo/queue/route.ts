import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface UserLevelRow {
  level: number;
}

interface QueueRow {
  id: string;
}

interface OpponentRow {
  user_id: string;
  level: number;
}

interface QuestionRow {
  id: string;
}

// POST - Masuk antrian solo
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
      // Dapatkan level user
      const userResult = await query<UserLevelRow>(
        "SELECT level FROM users WHERE id = $1",
        [userId]
      );

      const userData = getFirstRow(userResult);

      if (!userData) {
        return NextResponse.json(
          { error: "User tidak ditemukan" },
          { status: 404 }
        );
      }

      const level = Number(userData.level || 1);

      // Cek apakah user sudah di queue
      const existingResult = await query<QueueRow>(
        "SELECT id FROM solo_queue WHERE user_id = $1",
        [userId]
      );

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Anda sudah dalam antrian" },
          { status: 400 }
        );
      }

      // Cari lawan dengan level yang sama (±1)
      const opponentsResult = await query<OpponentRow>(
        `SELECT 
          sq.user_id,
          u.level
        FROM solo_queue sq
        JOIN users u ON sq.user_id = u.id
        WHERE u.level BETWEEN $1 AND $2
        AND sq.user_id != $3
        ORDER BY ABS(u.level - $4) ASC, sq.joined_at ASC
        LIMIT 1`,
        [level - 1, level + 1, userId, level]
      );

      if (opponentsResult.rows.length > 0) {
        // Dapatkan lawan!
        const opponent = opponentsResult.rows[0];
        const opponentId = opponent.user_id;
        const opponentLevel = Number(opponent.level || 1);

        // Buat match baru
        const matchId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        await query(
          `INSERT INTO matches (id, player1_id, player2_id, match_type, status) 
           VALUES ($1, $2, $3, 'SOLO', 'ONGOING')`,
          [matchId, userId, opponentId]
        );

        // Cari soal pertama (round 1)
        const avgLevel = Math.round((level + opponentLevel) / 2);
        const questionsResult = await query<QuestionRow>(
          `SELECT id FROM questions WHERE level = $1 ORDER BY RANDOM() LIMIT 1`,
          [avgLevel]
        );

        let questionId: string | null = null;
        if (questionsResult.rows.length > 0) {
          questionId = questionsResult.rows[0].id;
        } else {
          const fallbackResult = await query<QuestionRow>(
            `SELECT id FROM questions WHERE level = 1 ORDER BY RANDOM() LIMIT 1`
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

        // Hapus kedua user dari queue
        await query(
          "DELETE FROM solo_queue WHERE user_id IN ($1, $2)",
          [userId, opponentId]
        );

        // Trigger event ke kedua user
        await pusherServer.trigger("arena-global", "match-found", {
          player1Id: userId,
          player2Id: opponentId,
          matchId,
        });

        // Trigger ke channel user masing-masing
        await pusherServer.trigger(`user-${userId}`, "match-found", { matchId });
        await pusherServer.trigger(`user-${opponentId}`, "match-found", { matchId });

        return NextResponse.json({
          message: "Lawan ditemukan!",
          matchId,
          opponentId,
        });
      }

      // Tidak ada lawan, masuk queue
      const queueId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await query(
        "INSERT INTO solo_queue (id, user_id, level) VALUES ($1, $2, $3)",
        [queueId, userId, level]
      );

      return NextResponse.json({
        message: "Masuk antrian",
        userId,
        level,
      });
    } catch (error) {
      console.error("Error in solo queue:", error);
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