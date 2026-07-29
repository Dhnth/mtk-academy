import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

// Type definitions
interface MatchData {
  id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  score1: number;
  score2: number;
  match_type: "SOLO" | "TEAM";
  correct: string;
  match_question_id: string;
  round: number;
  player1_answer: string | null;
  player2_answer: string | null;
}

interface UserData {
  income: number;
  expense: number;
  level: number;
}

interface TeamMember {
  user_id: string;
  user_name: string;
}

interface MatchQuestionRow {
  id: string;
  match_id: string;
  question_id: string;
  round: number;
  player1_answer: string | null;
  player2_answer: string | null;
  player1_time: number | null;
  player2_time: number | null;
  time_limit: number;
}

interface ScoreRow {
  score1: number;
  score2: number;
}

// Fungsi untuk menghitung hadiah berdasarkan level
function calculateRewards(level: number) {
  const baseExpWin = 35;
  const baseMoneyWin = 10000000;
  const baseExpLose = -15;
  const baseMoneyLose = -5000000;
  
  const multiplier = Math.pow(1.5, level - 1);
  
  const expWin = Math.round(baseExpWin * multiplier);
  const moneyWin = Math.round(baseMoneyWin * multiplier);
  const expLose = Math.round(baseExpLose * multiplier);
  const moneyLose = Math.round(baseMoneyLose * multiplier);
  
  return { expWin, moneyWin, expLose, moneyLose };
}

// Fungsi untuk mendapatkan avg level match
async function getAvgLevel(matchId: string): Promise<number> {
  const matchDataResult = await query<{ player1_id: string; player2_id: string; match_type: "SOLO" | "TEAM" }>(
    "SELECT player1_id, player2_id, match_type FROM matches WHERE id = $1",
    [matchId]
  );
  const match = getFirstRow(matchDataResult);

  if (!match) return 1;

  let avgLevel = 1;

  if (match.match_type === "SOLO") {
    const levelsResult = await query<{ avg_level: number }>(
      `SELECT AVG(level) as avg_level FROM users WHERE id IN ($1, $2)`,
      [match.player1_id, match.player2_id]
    );
    const levels = getFirstRow(levelsResult);
    avgLevel = Math.round(Number(levels?.avg_level || 1));
  } else {
    const levelsResult = await query<{ avg_level: number }>(
      `SELECT AVG(u.level) as avg_level 
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id IN ($1, $2)`,
      [match.player1_id, match.player2_id]
    );
    const levels = getFirstRow(levelsResult);
    avgLevel = Math.round(Number(levels?.avg_level || 1));
  }

  return avgLevel;
}

export async function POST(
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
    const body = await request.json();
    const { questionId, answer, time } = body;

    if (!matchId || !questionId) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    try {
      // Get match data and the latest round question
      const matchResult = await query<MatchData>(
        `SELECT 
          m.id,
          m.player1_id,
          m.player2_id,
          m.status,
          m.score1,
          m.score2,
          m.match_type,
          q.correct,
          mq.id as match_question_id,
          mq.round,
          mq.player1_answer,
          mq.player2_answer
        FROM matches m
        JOIN match_questions mq ON m.id = mq.match_id
        JOIN questions q ON mq.question_id = q.id
        WHERE m.id = $1 AND mq.question_id = $2
        ORDER BY mq.round DESC
        LIMIT 1`,
        [matchId, questionId]
      );

      const match = getFirstRow(matchResult);

      if (!match) {
        return NextResponse.json(
          { error: "Match atau soal tidak ditemukan" },
          { status: 404 }
        );
      }

      if (match.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Match sudah selesai" },
          { status: 400 }
        );
      }

      // Cek user terlibat
      let isPlayer1 = false;
      let isPlayer2 = false;
      let team1Members: TeamMember[] = [];
      let team2Members: TeamMember[] = [];

      if (match.match_type === "SOLO") {
        isPlayer1 = match.player1_id === userId;
        isPlayer2 = match.player2_id === userId;
      } else {
        const p1MemberResult = await query<TeamMember>(
          `SELECT tm.user_id, u.name as user_name 
           FROM team_members tm JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`,
          [match.player1_id]
        );
        team1Members = p1MemberResult.rows;
        isPlayer1 = team1Members.some((m) => m.user_id === userId);

        const p2MemberResult = await query<TeamMember>(
          `SELECT tm.user_id, u.name as user_name 
           FROM team_members tm JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`,
          [match.player2_id]
        );
        team2Members = p2MemberResult.rows;
        isPlayer2 = team2Members.some((m) => m.user_id === userId);
      }

      if (!isPlayer1 && !isPlayer2) {
        return NextResponse.json(
          { error: "Anda tidak terlibat dalam match ini" },
          { status: 403 }
        );
      }

      // TEAM: turn-based check
      if (match.match_type === "TEAM") {
        const myTeamMembers = isPlayer1 ? team1Members : team2Members;
        const teamSize = myTeamMembers.length;

        if (teamSize === 0) {
          return NextResponse.json(
            { error: "Data tim tidak ditemukan" },
            { status: 400 }
          );
        }

        const turnIndex = (match.round - 1) % teamSize;
        const currentAnswerer = myTeamMembers[turnIndex]?.user_id;

        if (currentAnswerer !== userId) {
          const currentAnswererName =
            myTeamMembers[turnIndex]?.user_name || "Rekan tim Anda";
          return NextResponse.json(
            {
              notYourTurn: true,
              error: `Bukan giliran Anda. Giliran: ${currentAnswererName}`,
              currentAnswerer,
              currentAnswererName,
            },
            { status: 403 }
          );
        }
      }

      // Cek apakah sudah dijawab
      if (match.player1_answer !== null || match.player2_answer !== null) {
        return NextResponse.json(
          {
            alreadyAnswered: true,
            error: "Lawan sudah menjawab lebih cepat!",
          },
          { status: 400 }
        );
      }

      // Ambil time_limit dari match_questions
      const timeLimitResult = await query<{ time_limit: number }>(
        "SELECT time_limit FROM match_questions WHERE id = $1",
        [match.match_question_id]
      );
      const timeLimitData = getFirstRow(timeLimitResult);
      const timeLimit = timeLimitData?.time_limit || 30;

      const playerColumn = isPlayer1 ? "player1_answer" : "player2_answer";
      const timeColumn = isPlayer1 ? "player1_time" : "player2_time";
      const myScoreColumn = isPlayer1 ? "score1" : "score2";
      const opponentScoreColumn = isPlayer1 ? "score2" : "score1";

      const isTimeout = !answer || answer === "TIMEOUT";
      const isCorrect = !isTimeout && answer === match.correct;
      let winnerOfRound: string | null = null;

      // Update jawaban pemain ini di database - gunakan timeLimit
      await query(
        `UPDATE match_questions SET ${playerColumn} = $1, ${timeColumn} = $2 WHERE id = $3`,
        [answer || "TIMEOUT", time || timeLimit, match.match_question_id]
      );

      if (isTimeout) {
        winnerOfRound = null;
      } else if (isCorrect) {
        winnerOfRound = isPlayer1 ? match.player1_id : match.player2_id;
        await query(
          `UPDATE matches SET ${myScoreColumn} = ${myScoreColumn} + 1 WHERE id = $1`,
          [matchId]
        );
      } else {
        winnerOfRound = isPlayer1 ? match.player2_id : match.player1_id;
        await query(
          `UPDATE matches SET ${opponentScoreColumn} = ${opponentScoreColumn} + 1 WHERE id = $1`,
          [matchId]
        );
      }

      const scoreResult = await query<ScoreRow>(
        "SELECT score1, score2 FROM matches WHERE id = $1",
        [matchId]
      );

      const score = getFirstRow(scoreResult);
      const score1 = Number(score?.score1 || 0);
      const score2 = Number(score?.score2 || 0);

      let matchStatus = match.status;

      // Hitung target score berdasarkan level
      const avgLevel = await getAvgLevel(matchId);
      const targetScore = 2 + avgLevel; // Level 1 = 3, Level 2 = 4, Level 3 = 5, dst.

      if (score1 >= targetScore || score2 >= targetScore) {
        await endMatch(matchId, match, score1, score2);
        matchStatus = "COMPLETED";
      } else {
        await loadNextQuestion(matchId);
      }

      const userResult = await query<{ name: string }>(
        "SELECT name FROM users WHERE id = $1",
        [userId]
      );
      const user = getFirstRow(userResult);
      const answeredByName = user?.name || "Player";

      let nextAnswerer1: string | null = null;
      let nextAnswerer1Name: string | null = null;
      let nextAnswerer2: string | null = null;
      let nextAnswerer2Name: string | null = null;

      if (match.match_type === "TEAM" && matchStatus !== "COMPLETED") {
        const nextRound = match.round + 1;

        if (team1Members.length > 0) {
          const nextIdx1 = (nextRound - 1) % team1Members.length;
          nextAnswerer1 = team1Members[nextIdx1]?.user_id || null;
          nextAnswerer1Name = team1Members[nextIdx1]?.user_name || null;
        }
        if (team2Members.length > 0) {
          const nextIdx2 = (nextRound - 1) % team2Members.length;
          nextAnswerer2 = team2Members[nextIdx2]?.user_id || null;
          nextAnswerer2Name = team2Members[nextIdx2]?.user_name || null;
        }
      }

      await pusherServer.trigger(`match-${matchId}`, "question-update", {
        matchId,
        questionId,
        round: match.round,
        answeredBy: userId,
        answeredByName,
        isCorrect,
        isTimeout,
        winnerOfRound,
        score1,
        score2,
        correctAnswer: match.correct,
        status: matchStatus,
        nextAnswerer1,
        nextAnswerer1Name,
        nextAnswerer2,
        nextAnswerer2Name,
      });

      return NextResponse.json({
        alreadyAnswered: false,
        correct: isCorrect,
        isTimeout,
        answeredBy: userId,
        answeredByName,
        winnerOfRound,
        score1,
        score2,
        correctAnswer: match.correct,
        status: matchStatus,
        round: match.round,
        nextAnswerer1,
        nextAnswerer1Name,
        nextAnswerer2,
        nextAnswerer2Name,
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      return NextResponse.json(
        { error: "Gagal mengirim jawaban" },
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

// Helper: End match
async function endMatch(
  matchId: string,
  match: MatchData,
  score1: number,
  score2: number
) {
  const winnerId = score1 > score2 ? match.player1_id : match.player2_id;
  await query(
    "UPDATE matches SET status = 'COMPLETED', winner_id = $1 WHERE id = $2",
    [winnerId, matchId]
  );

  await updateUserStats(matchId, match.player1_id, match.player2_id, winnerId, match.match_type);

  if (match.match_type === "TEAM") {
    const resetTeamStatus = async (tId: string) => {
      const countResult = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM team_members WHERE team_id = $1",
        [tId]
      );
      const countRow = getFirstRow(countResult);
      const count = Number(countRow?.count || 0);
      const newStatus = count >= 4 ? "FULL" : "WAITING";
      await query("UPDATE teams SET status = $1 WHERE id = $2", [newStatus, tId]);
    };

    await resetTeamStatus(match.player1_id);
    await resetTeamStatus(match.player2_id);
  }

  let winnerName = "Winner";
  if (match.match_type === "SOLO") {
    const wUserResult = await query<{ name: string }>(
      "SELECT name FROM users WHERE id = $1",
      [winnerId]
    );
    const wUser = getFirstRow(wUserResult);
    winnerName = wUser?.name || "Winner";
  } else {
    const wTeamResult = await query<{ name: string }>(
      "SELECT name FROM teams WHERE id = $1",
      [winnerId]
    );
    const wTeam = getFirstRow(wTeamResult);
    winnerName = wTeam?.name || "Winner Team";
  }

  await pusherServer.trigger(`match-${matchId}`, "match-ended", {
    winner_id: winnerId,
    winner_name: winnerName,
    score1,
    score2,
  });
}

// Helper: Update user stats with progressive rewards
// Helper: Update user stats with progressive rewards
async function updateUserStats(
  matchId: string,
  player1Id: string,
  player2Id: string,
  winnerId: string,
  matchType: "SOLO" | "TEAM"
) {
  let winners: string[] = [];
  let losers: string[] = [];

  if (matchType === "SOLO") {
    winners = [winnerId];
    losers = [winnerId === player1Id ? player2Id : player1Id];
  } else {
    const winMembersResult = await query<{ user_id: string }>(
      "SELECT user_id FROM team_members WHERE team_id = $1",
      [winnerId]
    );
    winners = winMembersResult.rows.map((m) => m.user_id);

    const loserTeamId = winnerId === player1Id ? player2Id : player1Id;
    const loseMembersResult = await query<{ user_id: string }>(
      "SELECT user_id FROM team_members WHERE team_id = $1",
      [loserTeamId]
    );
    losers = loseMembersResult.rows.map((m) => m.user_id);
  }

  // UPDATE WINNERS
  for (const wId of winners) {
    const userDataResult = await query<{ level: number }>(
      "SELECT level FROM users WHERE id = $1",
      [wId]
    );
    const userData = getFirstRow(userDataResult);
    const level = Number(userData?.level || 1);
    
    const { expWin, moneyWin } = calculateRewards(level);
    
    await query(
      `UPDATE users SET wins = wins + 1, exp = exp + $1, income = income + $2 WHERE id = $3`,
      [expWin, moneyWin, wId]
    );

    const rewardId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString();
    await query(
      `INSERT INTO match_rewards (id, match_id, player_id, action, exp_change, money_change) 
       VALUES ($1, $2, $3, 'WIN', $4, $5)`,
      [rewardId, matchId, wId, expWin, moneyWin]
    );
  }

  // UPDATE LOSERS - dengan cek EXP tersisa
  for (const lId of losers) {
    const userDataResult = await query<{ level: number; income: number; expense: number; exp: number }>(
      "SELECT level, income, expense, exp FROM users WHERE id = $1",
      [lId]
    );
    const userData = getFirstRow(userDataResult);
    const level = Number(userData?.level || 1);
    const currentIncome = Number(userData?.income || 0);
    const currentExpense = Number(userData?.expense || 0);
    const currentExp = Number(userData?.exp || 0);
    const currentBalance = currentIncome - currentExpense;
    
    const { expLose, moneyLose } = calculateRewards(level);
    const deductionAmount = Math.abs(moneyLose);

    // ================================================================
    // CEK EXP: Hanya kurangi sebanyak yang tersedia (minimal 0)
    // ================================================================
    const expReduction = Math.abs(expLose); // expLose negatif, ambil absolutnya
    const actualExpReduction = Math.min(expReduction, currentExp); // Kurangi sebanyak yang tersedia
    const newExp = currentExp - actualExpReduction; // EXP baru (pasti >= 0)

    // ================================================================
    // CEK SALDO: Kurangi income, jika kurang maka expense nambah
    // ================================================================
    let newIncome = currentIncome;
    let newExpense = currentExpense;

    if (currentBalance >= deductionAmount) {
      newIncome = currentIncome - deductionAmount;
    } else {
      newIncome = 0;
      const remaining = deductionAmount - currentBalance;
      newExpense = currentExpense + remaining;
    }

    await query(
      `UPDATE users SET 
        losses = losses + 1, 
        exp = $1, 
        income = $2, 
        expense = $3 
      WHERE id = $4`,
      [newExp, newIncome, newExpense, lId]
    );

    const rewardId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString();
    await query(
      `INSERT INTO match_rewards (id, match_id, player_id, action, exp_change, money_change) 
       VALUES ($1, $2, $3, 'LOSE', $4, $5)`,
      [rewardId, matchId, lId, -actualExpReduction, moneyLose] // exp_change negatif sesuai yang dikurangi
    );
  }
}

// Helper: Load next question with dynamic time limit
async function loadNextQuestion(matchId: string) {
  const currentResult = await query<{ max_round: number }>(
    "SELECT MAX(round) as max_round FROM match_questions WHERE match_id = $1",
    [matchId]
  );
  const current = getFirstRow(currentResult);
  const currentRound = Number(current?.max_round || 0);
  const nextRound = currentRound + 1;

  const matchDataResult = await query<{ player1_id: string; player2_id: string; match_type: "SOLO" | "TEAM" }>(
    "SELECT player1_id, player2_id, match_type FROM matches WHERE id = $1",
    [matchId]
  );
  const match = getFirstRow(matchDataResult);

  let avgLevel = 1;

  if (match?.match_type === "SOLO") {
    const levelsResult = await query<{ avg_level: number }>(
      `SELECT AVG(level) as avg_level FROM users WHERE id IN ($1, $2)`,
      [match.player1_id, match.player2_id]
    );
    const levels = getFirstRow(levelsResult);
    avgLevel = Math.round(Number(levels?.avg_level || 1));
  } else if (match) {
    const levelsResult = await query<{ avg_level: number }>(
      `SELECT AVG(u.level) as avg_level 
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id IN ($1, $2)`,
      [match.player1_id, match.player2_id]
    );
    const levels = getFirstRow(levelsResult);
    avgLevel = Math.round(Number(levels?.avg_level || 1));
  }

  // Hitung time limit: 30 + (level - 1) * 5
  const timeLimit = 30 + (avgLevel - 1) * 5;

  const questionsResult = await query<{ id: string }>(
    `SELECT id FROM questions WHERE level = $1 ORDER BY RANDOM() LIMIT 1`,
    [avgLevel]
  );

  let questionId: string | null = null;
  if (questionsResult.rows.length > 0) {
    questionId = questionsResult.rows[0].id;
  } else {
    const fallbackResult = await query<{ id: string }>(
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
       VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL, $5)`,
      [mqId, matchId, questionId, nextRound, timeLimit]
    );
  }
}