import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface MatchRow {
  status: string;
  player1_id: string;
  player2_id: string;
}

interface QuestionRow {
  id: string;
  question_id: string;
  round: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  player1_answer: string | null;
  player2_answer: string | null;
  player1_time: number | null;
  player2_time: number | null;
  time_limit: number;
}

interface PrevQuestionRow {
  round: number;
  player1_answer: string | null;
  player2_answer: string | null;
  correct: string;
}

interface ScoreRow {
  score1: number;
  score2: number;
  status: string;
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
      // Check match status
      const matchResult = await query<MatchRow>(
        "SELECT status, player1_id, player2_id FROM matches WHERE id = $1",
        [matchId]
      );

      const match = getFirstRow(matchResult);

      if (!match) {
        return NextResponse.json(
          { error: "Match tidak ditemukan" },
          { status: 404 }
        );
      }

      if (match.status === "COMPLETED" || match.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Match sudah selesai" },
          { status: 400 }
        );
      }

      // Get the latest active question round for this match
      const questionsResult = await query<QuestionRow>(
        `SELECT 
          mq.id,
          mq.question_id,
          mq.round,
          q.question,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct,
          mq.player1_answer,
          mq.player2_answer,
          mq.player1_time,
          mq.player2_time,
          mq.time_limit
        FROM match_questions mq
        JOIN questions q ON mq.question_id = q.id
        WHERE mq.match_id = $1
        ORDER BY mq.round DESC
        LIMIT 1`,
        [matchId]
      );

      const q = getFirstRow(questionsResult);

      if (!q) {
        return NextResponse.json(
          { error: "Tidak ada soal" },
          { status: 404 }
        );
      }

      const isAnswered = q.player1_answer !== null || q.player2_answer !== null;

      // Get previous round info if round > 1
      let lastRoundResult = null;
      if (q.round > 1) {
        const prevResult = await query<PrevQuestionRow>(
          `SELECT 
            mq.round,
            mq.player1_answer,
            mq.player2_answer,
            q.correct
          FROM match_questions mq
          JOIN questions q ON mq.question_id = q.id
          WHERE mq.match_id = $1 AND mq.round = $2`,
          [matchId, q.round - 1]
        );

        const pq = getFirstRow(prevResult);

        if (pq) {
          let answeredBy = null;
          let isCorrect = false;
          let isTimeout = false;

          if (pq.player1_answer !== null) {
            answeredBy = match.player1_id;
            isTimeout = pq.player1_answer === "TIMEOUT";
            isCorrect = !isTimeout && pq.player1_answer === pq.correct;
          } else if (pq.player2_answer !== null) {
            answeredBy = match.player2_id;
            isTimeout = pq.player2_answer === "TIMEOUT";
            isCorrect = !isTimeout && pq.player2_answer === pq.correct;
          } else {
            isTimeout = true;
          }

          lastRoundResult = {
            round: pq.round,
            answeredBy,
            isCorrect,
            isTimeout,
            correctAnswer: pq.correct,
          };
        }
      }

      // Also get current match score & status
      const scoreResult = await query<ScoreRow>(
        "SELECT score1, score2, status FROM matches WHERE id = $1",
        [matchId]
      );

      const score = getFirstRow(scoreResult);

      return NextResponse.json({
        question: {
          id: q.question_id,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct: q.correct,
        },
        round: q.round,
        player1_answer: q.player1_answer,
        player2_answer: q.player2_answer,
        player1_time: q.player1_time,
        player2_time: q.player2_time,
        time_limit: q.time_limit || 30,
        is_answered: isAnswered,
        score1: Number(score?.score1 || 0),
        score2: Number(score?.score2 || 0),
        matchStatus: score?.status || "ONGOING",
        lastRoundResult,
      });
    } catch (error) {
      console.error("Error fetching question:", error);
      return NextResponse.json(
        { error: "Gagal mengambil soal" },
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