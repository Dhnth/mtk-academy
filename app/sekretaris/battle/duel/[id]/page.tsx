"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Swords,
  Clock,
  User,
  X,
  Loader2,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Zap,
  ZapOff,
  Sparkles,
  Users,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
}

interface TeamMemberInfo {
  user_id: string;
  user_name: string;
}

interface MatchData {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  player1_level: number;
  player2_level: number;
  score1: number;
  score2: number;
  match_type: "SOLO" | "TEAM";
  status: "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  total_rounds: number;
  winner_id: string | null;
  winner_name: string | null;
  userId: string;
  userTeamId: string | null;
  isPlayer1: boolean;
  isWinner: boolean;
  exp_change: number;
  money_change: number;
  team1Members: TeamMemberInfo[];
  team2Members: TeamMemberInfo[];
}

interface MatchQuestion {
  question: Question;
  round: number;
  player1_answer: string | null;
  player2_answer: string | null;
  player1_time: number | null;
  player2_time: number | null;
  time_limit: number;
  is_answered?: boolean;
}

interface QuestionUpdateData {
  matchId: string;
  questionId: string;
  round: number;
  answeredBy: string;
  answeredByName: string;
  isCorrect: boolean;
  isTimeout?: boolean;
  winnerOfRound: string | null;
  score1: number;
  score2: number;
  correctAnswer: string;
  status: "ONGOING" | "COMPLETED";
  nextAnswerer1?: string | null;
  nextAnswerer1Name?: string | null;
  nextAnswerer2?: string | null;
  nextAnswerer2Name?: string | null;
}

interface MatchEndedData {
  winner_id: string;
  winner_name: string;
  score1: number;
  score2: number;
}

interface ResultData {
  isWinner: boolean;
  winner: string;
  score1: number;
  score2: number;
  expChange: number;
  moneyChange: number;
}

interface OverlayInfo {
  show: boolean;
  type: "correct" | "wrong" | "too_slow" | "opponent_wrong" | "timeout";
  title: string;
  subtitle: string;
  correctAnswer?: string;
}

export default function DuelPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<MatchQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [overlayInfo, setOverlayInfo] = useState<OverlayInfo>({
    show: false,
    type: "correct",
    title: "",
    subtitle: "",
  });

  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // Refs to avoid stale closures
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchIdRef = useRef(matchId);
  const currentQuestionRef = useRef<MatchQuestion | null>(null);
  const hasAnsweredRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const matchRef = useRef<MatchData | null>(null);
  const processedRoundRef = useRef<number | null>(null);

  // NOTE: refs must not be updated during render. They will be synced in effects below.

  // ── Helper: Compute whose turn it is ──────────────────────────
  const getMyTurnInfo = useCallback(
    (round: number, matchData: MatchData | null) => {
      if (!matchData || matchData.match_type === "SOLO") {
        return { isMyTurn: true, currentAnswererName: null, currentAnswererId: null };
      }

      const myTeamMembers = matchData.isPlayer1
        ? matchData.team1Members
        : matchData.team2Members;

      if (!myTeamMembers || myTeamMembers.length === 0) {
        return { isMyTurn: true, currentAnswererName: null, currentAnswererId: null };
      }

      const turnIndex = (round - 1) % myTeamMembers.length;
      const currentAnswerer = myTeamMembers[turnIndex];

      return {
        isMyTurn: currentAnswerer?.user_id === matchData.userId,
        currentAnswererName: currentAnswerer?.user_name || null,
        currentAnswererId: currentAnswerer?.user_id || null,
      };
    },
    []
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const [pendingRoundResult, setPendingRoundResult] = useState<
    | {
        round: number;
        answeredBy: string;
        answeredByName?: string;
        isCorrect: boolean;
        isTimeout?: boolean;
        score1: number;
        score2: number;
        correctAnswer?: string;
        status: "ONGOING" | "COMPLETED";
      }
    | null
  >(null);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimer(seconds);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            stopTimer();
            // Auto-submit timeout only if it's user's turn
            if (!hasAnsweredRef.current && !isSubmittingRef.current) {
              const q = currentQuestionRef.current;
              const m = matchRef.current;
              if (q) {
                const { isMyTurn } = getMyTurnInfo(q.round, m);
                if (isMyTurn) {
                  isSubmittingRef.current = true;
                  fetch(`/api/battle/match/${matchIdRef.current}/answer`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      questionId: q.question.id,
                      answer: null,
                      time: seconds,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      setHasAnswered(true);
                      if (data && !data.error) {
                        setPendingRoundResult({
                          round: data.round || q.round,
                          answeredBy: data.answeredBy || userIdRef.current || "",
                          answeredByName: data.answeredByName,
                          isCorrect: false,
                          isTimeout: true,
                          score1: data.score1,
                          score2: data.score2,
                          correctAnswer: data.correctAnswer,
                          status: data.status,
                        });
                      }
                    })
                    .catch(console.error)
                    .finally(() => {
                      isSubmittingRef.current = false;
                    });
                }
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer, getMyTurnInfo] // processRoundResultCallback is defined below via ref
  );

  // We use a ref to avoid circular dependency
  const processRoundResultRef = useRef<
    | ((
        round: number,
        data: {
          answeredBy: string;
          answeredByName?: string;
          isCorrect: boolean;
          isTimeout?: boolean;
          score1: number;
          score2: number;
          correctAnswer?: string;
          status: "ONGOING" | "COMPLETED";
        }
      ) => void)
    | null
  >(null);

  // `processRoundResultRef` will be called by timers / network callbacks.

  // Load question and start timer
  const loadQuestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle/match/${matchIdRef.current}/question`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          setCurrentQuestion(null);
          stopTimer();
          return;
        }
        throw new Error("Gagal mengambil soal");
      }
      const data: MatchQuestion = await res.json();

      setCurrentQuestion((prev) => {
        if (prev?.question.id === data.question.id && prev?.round === data.round) {
          return prev;
        }
        // Reset state for new round
        setHasAnswered(false);
        setSelectedOption(null);
        isSubmittingRef.current = false;
        startTimer(data.time_limit || 30);
        return data;
      });
    } catch (err) {
      console.error("Error loading question:", err);
    }
  }, [startTimer, stopTimer]);

  // Load match data
  const loadMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle/match/${matchIdRef.current}`);
      if (!res.ok) throw new Error("Gagal mengambil data match");
      const data: MatchData = await res.json();
      setMatch(data);
      userIdRef.current = data.userId;

      if (data.status === "COMPLETED") {
        stopTimer();
        setShowResult(true);
        setResultData({
          isWinner: data.isWinner,
          winner: data.winner_name || "—",
          score1: data.score1,
          score2: data.score2,
          expChange: data.exp_change || 0,
          moneyChange: data.money_change || 0,
        });
      }
    } catch (err) {
      console.error("Error loading match:", err);
      setError("Gagal memuat data duel");
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  // Process round result helper (idempotent per round)
  const processRoundResult = useCallback(
    (
      round: number,
      data: {
        answeredBy: string;
        answeredByName?: string;
        isCorrect: boolean;
        isTimeout?: boolean;
        score1: number;
        score2: number;
        correctAnswer?: string;
        status: "ONGOING" | "COMPLETED";
      }
    ) => {
      // Prevent double processing of the same round
      if (processedRoundRef.current === round) return;
      processedRoundRef.current = round;

      stopTimer();
      setHasAnswered(true);

      const currentUserId = userIdRef.current;

      let type: OverlayInfo["type"] = "timeout";
      let title = "";
      let subtitle = "";

      if (data.isTimeout) {
        type = "timeout";
        title = "WAKTU HABIS";
        subtitle = "Tidak ada poin diberikan pada ronde ini";
      } else if (matchRef.current && matchRef.current.match_type === "TEAM") {
        // For TEAM matches, determine whether the answerer belongs to our team
        const myTeamMembers = matchRef.current.isPlayer1
          ? matchRef.current.team1Members
          : matchRef.current.team2Members;

        const answeredIsOnMyTeam = myTeamMembers.some(
          (m) => m.user_id === data.answeredBy
        );

        if (answeredIsOnMyTeam) {
          if (data.isCorrect) {
            type = "correct";
            title = "JAWABAN BENAR!";
            subtitle = "+1 Poin untuk Tim Anda";
          } else {
            type = "wrong";
            title = "SALAH JAWAB!";
            subtitle = "Tim lawan mendapat +1 Poin";
          }
        } else {
          // answered by opponent team
          if (data.isCorrect) {
            type = "too_slow";
            title = "KURANG CEPAT!";
            subtitle = `${data.answeredByName || "Lawan"} menjawab benar (+1 Poin lawan)`;
          } else {
            type = "opponent_wrong";
            title = "LAWAN SALAH JAWAB!";
            subtitle = "+1 Poin gratis untuk Tim Anda";
          }
        }
      } else {
        // SOLO or fallback: mark based on whether the answerer is current user
        const isMe = data.answeredBy === currentUserId;
        if (isMe) {
          if (data.isCorrect) {
            type = "correct";
            title = "JAWABAN BENAR!";
            subtitle = "+1 Poin untuk Tim Anda";
          } else {
            type = "wrong";
            title = "SALAH JAWAB!";
            subtitle = "Tim lawan mendapat +1 Poin";
          }
        } else {
          if (data.isCorrect) {
            type = "too_slow";
            title = "KURANG CEPAT!";
            subtitle = `${data.answeredByName || "Lawan"} menjawab benar (+1 Poin lawan)`;
          } else {
            type = "opponent_wrong";
            title = "LAWAN SALAH JAWAB!";
            subtitle = "+1 Poin gratis untuk Tim Anda";
          }
        }
      }

      // Update match scores instantly
      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          score1: data.score1,
          score2: data.score2,
          status: data.status,
        };
      });

      // Trigger 2-second Overlay
      setOverlayInfo({
        show: true,
        type,
        title,
        subtitle,
        correctAnswer: data.correctAnswer,
      });

      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => {
        setOverlayInfo((prev) => ({ ...prev, show: false }));

        if (data.status === "COMPLETED") {
          loadMatch();
        } else {
          loadQuestion();
          loadMatch();
        }
      }, 2000);
    },
    [stopTimer, loadMatch, loadQuestion]
  );

  // Keep refs in sync AFTER render to satisfy eslint/react-hooks/refs
  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);

  useEffect(() => {
    matchRef.current = match;
    if (match?.userId) userIdRef.current = match.userId;
  }, [match]);

  // Process any pending server responses coming from timeouts
  useEffect(() => {
    if (pendingRoundResult) {
      processRoundResult(pendingRoundResult.round, pendingRoundResult);
      setPendingRoundResult(null);
    }
  }, [pendingRoundResult, processRoundResult]);

  // Polling fallback loop every 1.5s
  useEffect(() => {
    if (!matchId || showResult) return;

    const pollInterval = setInterval(async () => {
      if (overlayInfo.show) return;

      try {
        const res = await fetch(`/api/battle/match/${matchIdRef.current}/question`);
        if (!res.ok) return;
        const qData = await res.json();

        const currentQ = currentQuestionRef.current;
        if (!currentQ) return;

        if (qData.matchStatus === "COMPLETED") {
          loadMatch();
          return;
        }

        if (qData.round > currentQ.round && qData.lastRoundResult) {
          processRoundResult(qData.lastRoundResult.round, {
            answeredBy: qData.lastRoundResult.answeredBy || "",
            isCorrect: qData.lastRoundResult.isCorrect,
            isTimeout: qData.lastRoundResult.isTimeout,
            score1: qData.score1,
            score2: qData.score2,
            correctAnswer: qData.lastRoundResult.correctAnswer,
            status: qData.matchStatus,
          });
        }
      } catch {
        // silent catch
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [matchId, showResult, overlayInfo.show, processRoundResult, loadMatch]);

  // Submit answer
  const handleAnswer = async (option: string) => {
    if (!currentQuestion) return;

    const m = matchRef.current;
    const { isMyTurn } = getMyTurnInfo(currentQuestion.round, m);

    // For TEAM: if not my turn, silently ignore
    if (!isMyTurn) return;

    if (hasAnsweredRef.current || isSubmittingRef.current) return;

    const q = currentQuestion;
    const timeTaken = (q.time_limit || 30) - timer;

    isSubmittingRef.current = true;
    setHasAnswered(true);
    setSelectedOption(option);
    stopTimer();

    try {
      const res = await fetch(`/api/battle/match/${matchId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.question.id,
          answer: option,
          time: timeTaken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.alreadyAnswered || data?.notYourTurn) return;
        // Roll back UI on other errors
        setHasAnswered(false);
        setSelectedOption(null);
        startTimer(q.time_limit || 30);
        return;
      }

      if (res.ok && data) {
        processRoundResult(data.round || q.round, {
          answeredBy: data.answeredBy,
          answeredByName: data.answeredByName,
          isCorrect: data.correct,
          isTimeout: data.isTimeout,
          score1: data.score1,
          score2: data.score2,
          correctAnswer: data.correctAnswer,
          status: data.status,
        });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      setHasAnswered(false);
      setSelectedOption(null);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Pusher subscriptions
  useEffect(() => {
    // subscribe only when match data is loaded to avoid race where events arrive
    // before we know the current user's id / team membership
    if (!match || !matchId || !pusherClient) return;

    const channel = pusherClient.subscribe(`match-${matchId}`);

    channel.bind("question-update", (data: QuestionUpdateData) => {
      processRoundResult(data.round, {
        answeredBy: data.answeredBy,
        answeredByName: data.answeredByName,
        isCorrect: data.isCorrect,
        isTimeout: data.isTimeout,
        score1: data.score1,
        score2: data.score2,
        correctAnswer: data.correctAnswer,
        status: data.status,
      });
    });

    channel.bind("match-update", () => {
      loadMatch();
    });

    channel.bind("match-ended", (data: MatchEndedData) => {
      stopTimer();
      fetch(`/api/battle/match/${matchId}`)
        .then((r) => r.json())
        .then((matchData: MatchData) => {
          setMatch(matchData);
          setShowResult(true);
          setResultData({
            isWinner: matchData.isWinner,
            winner: data.winner_name || matchData.winner_name || "—",
            score1: data.score1,
            score2: data.score2,
            expChange: matchData.exp_change || 0,
            moneyChange: matchData.money_change || 0,
          });
          setCurrentQuestion(null);
        })
        .catch(console.error);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      stopTimer();
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, processRoundResult, loadMatch, stopTimer]);

  // Initial load
  useEffect(() => {
    loadMatch();
    loadQuestion();
    return () => {
      stopTimer();
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // ── Derived: is it my turn? ────────────────────────────────────
  const turnInfo = currentQuestion
    ? getMyTurnInfo(currentQuestion.round, match)
    : { isMyTurn: true, currentAnswererName: null, currentAnswererId: null };
  const isTeam = match?.match_type === "TEAM";

  const getTimerColor = () => {
    if (timer > 20) return "text-emerald-600";
    if (timer > 10) return "text-amber-500";
    return "text-red-600";
  };

  const getTimerBg = () => {
    if (timer > 20) return "bg-emerald-50 border-emerald-200";
    if (timer > 10) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const getOptionStyle = (optionKey: string) => {
    const base =
      "w-full px-4 py-3.5 text-left border rounded-xl transition-all text-sm font-medium flex items-center justify-between";
    const isDisabled = hasAnswered || overlayInfo.show || !turnInfo.isMyTurn;
    if (!isDisabled) {
      return `${base} border-slate-200 hover:border-blue-500 hover:bg-blue-50/70 hover:shadow-xs cursor-pointer text-slate-800`;
    }
    if (optionKey === selectedOption) {
      return `${base} bg-blue-600 border-blue-600 text-white font-bold shadow-md`;
    }
    return `${base} bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Duel</h3>
        <p className="text-slate-500 text-center">{error}</p>
        <button
          onClick={() => router.push("/sekretaris/battle")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Kembali ke Battle
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Duel Tidak Ditemukan</h3>
        <button
          onClick={() => router.push("/sekretaris/battle")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Kembali ke Battle
        </button>
      </div>
    );
  }

  // ── Result Screen ──────────────────────────────────────────────
  if (showResult && resultData) {
    const fmt = (n: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(n);

    return (
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
              resultData.isWinner
                ? "bg-emerald-100 shadow-emerald-100"
                : "bg-red-100 shadow-red-100"
            } shadow-xl border ${
              resultData.isWinner ? "border-emerald-200" : "border-red-200"
            }`}
          >
            {resultData.isWinner ? (
              <Trophy className="w-12 h-12 text-emerald-600" />
            ) : (
              <X className="w-12 h-12 text-red-600" />
            )}
          </div>
          <h2 className="font-mono text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
            {resultData.isWinner ? (
              <>
                <Sparkles className="w-7 h-7 text-emerald-500" />
                MENANG!
              </>
            ) : (
              <>
                <X className="w-7 h-7 text-red-500" />
                KALAH!
              </>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Skor akhir: {resultData.score1} – {resultData.score2}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            Hadiah Pertandingan
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">EXP</span>
            <span
              className={`font-mono font-bold text-lg ${
                resultData.expChange >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {resultData.expChange >= 0 ? "+" : ""}
              {resultData.expChange}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Uang</span>
            <span
              className={`font-mono font-bold text-lg ${
                resultData.moneyChange >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {resultData.moneyChange >= 0 ? "+" : ""}
              {fmt(resultData.moneyChange)}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/sekretaris/battle")}
          className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Battle
        </button>
      </div>
    );
  }

  // ── Duel Screen ────────────────────────────────────────────────
  const isPlayer1 = match.isPlayer1;
  const myScore = isPlayer1 ? match.score1 : match.score2;
  const opponentScore = isPlayer1 ? match.score2 : match.score1;
  const myName = isPlayer1 ? match.player1_name : match.player2_name;
  const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
  const myLevel = isPlayer1 ? match.player1_level : match.player2_level;
  const opponentLevel = isPlayer1 ? match.player2_level : match.player1_level;

  // Team member lists
  const myTeamMembers = isPlayer1 ? match.team1Members : match.team2Members;
  const opponentTeamMembers = isPlayer1 ? match.team2Members : match.team1Members;

  return (
    <div className="space-y-4 max-w-lg mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/sekretaris/battle")}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {isTeam ? (
            <Users className="w-4 h-4 text-purple-600" />
          ) : (
            <Swords className="w-4 h-4 text-blue-600" />
          )}
          <span className="font-mono font-semibold">
            {isTeam ? "Team Battle" : "Solo Duel"} #{matchId.slice(0, 8)}
          </span>
        </div>
        {/* Timer pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${getTimerBg()} ${getTimerColor()}`}
        >
          <Clock className="w-3.5 h-3.5" />
          {timer}s
        </div>
      </div>

      {/* Score Board */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          {/* Me / My Team */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
              {isTeam ? (
                <Users className="w-4 h-4 text-blue-600" />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{myName}</p>
              <p className="text-[10px] font-mono text-slate-400">Lvl {myLevel}</p>
            </div>
          </div>

          {/* Score */}
          <div className="text-center shrink-0 px-3 py-1 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-3xl font-black transition-all ${
                  myScore > opponentScore ? "text-emerald-600" : "text-slate-800"
                }`}
              >
                {myScore}
              </span>
              <span className="text-slate-300 font-mono text-lg">–</span>
              <span
                className={`font-mono text-3xl font-black transition-all ${
                  opponentScore > myScore ? "text-red-500" : "text-slate-800"
                }`}
              >
                {opponentScore}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
              First to 3
            </p>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <div className="min-w-0 text-right">
              <p className="font-semibold text-slate-900 text-sm truncate">{opponentName}</p>
              <p className="text-[10px] font-mono text-slate-400">Lvl {opponentLevel}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
              {isTeam ? (
                <Users className="w-4 h-4 text-red-500" />
              ) : (
                <User className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* TEAM: Player lineup with turn indicator */}
        {isTeam && currentQuestion && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            {/* My team lineup */}
            <div className="space-y-1">
              <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Tim Anda</p>
              {myTeamMembers.map((member, idx) => {
                const turnIndex = (currentQuestion.round - 1) % myTeamMembers.length;
                const isActive = idx === turnIndex;
                return (
                  <div
                    key={member.user_id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                      isActive
                        ? "bg-blue-50 border border-blue-200 text-blue-700 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {isActive && <Zap className="w-3 h-3 text-blue-500 shrink-0" />}
                    <span className="truncate">{member.user_name}</span>
                    {member.user_id === match.userId && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded shrink-0">Kamu</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Opponent team lineup */}
            <div className="space-y-1">
              <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Tim Lawan</p>
              {opponentTeamMembers.map((member, idx) => {
                const turnIndex = (currentQuestion.round - 1) % opponentTeamMembers.length;
                const isActive = idx === turnIndex;
                return (
                  <div
                    key={member.user_id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono justify-end transition-all ${
                      isActive
                        ? "bg-red-50 border border-red-200 text-red-700 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="truncate">{member.user_name}</span>
                    {isActive && <Zap className="w-3 h-3 text-red-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Turn Banner for TEAM */}
      {isTeam && currentQuestion && !hasAnswered && !overlayInfo.show && (
        <div
          className={`rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-mono font-bold border ${
            turnInfo.isMyTurn
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          {turnInfo.isMyTurn ? (
            <>
              <Zap className="w-4 h-4 text-blue-500" />
              Giliran Anda – Jawab sekarang!
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-slate-400" />
              Menunggu giliran:{" "}
              <span className="font-bold text-slate-700">
                {turnInfo.currentAnswererName}
              </span>
            </>
          )}
        </div>
      )}

      {/* Question Area & Overlay Container */}
      {currentQuestion ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-5 relative overflow-hidden min-h-[320px]">
          {/* Round indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Ronde {currentQuestion.round}
            </span>
            <span className="text-xs font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-600" />
              Speed Race
            </span>
          </div>

          {/* Question Text */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-base font-medium text-slate-900 leading-relaxed">
              {currentQuestion.question.question}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { key: "A", value: currentQuestion.question.option_a },
              { key: "B", value: currentQuestion.question.option_b },
              { key: "C", value: currentQuestion.question.option_c },
              { key: "D", value: currentQuestion.question.option_d },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleAnswer(option.key)}
                disabled={hasAnswered || overlayInfo.show || !turnInfo.isMyTurn}
                className={getOptionStyle(option.key)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-1 bg-white/30 rounded-md">
                    {option.key}
                  </span>
                  <span>{option.value}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Overlay Penanda (Ronde Result Banner) */}
          {overlayInfo.show && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 text-center">
              {overlayInfo.type === "correct" ||
              overlayInfo.type === "opponent_wrong" ? (
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-3 animate-pulse shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
              ) : overlayInfo.type === "wrong" ? (
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-3 shadow-lg shadow-red-500/20">
                  <X className="w-10 h-10 text-red-400" />
                </div>
              ) : overlayInfo.type === "too_slow" ? (
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                  <ZapOff className="w-10 h-10 text-amber-400" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-500/20 border-2 border-slate-500/40 flex items-center justify-center mb-3 shadow-lg">
                  <Clock className="w-10 h-10 text-slate-300" />
                </div>
              )}

              <h3
                className={`font-mono text-2xl font-black tracking-tight mb-1 ${
                  overlayInfo.type === "correct" ||
                  overlayInfo.type === "opponent_wrong"
                    ? "text-emerald-400"
                    : overlayInfo.type === "wrong"
                    ? "text-red-400"
                    : overlayInfo.type === "too_slow"
                    ? "text-amber-400"
                    : "text-slate-300"
                }`}
              >
                {overlayInfo.title}
              </h3>

              <p className="text-sm font-medium text-slate-200 max-w-xs leading-snug">
                {overlayInfo.subtitle}
              </p>

              {overlayInfo.correctAnswer && (
                <div className="mt-3 px-3 py-1 bg-white/10 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Jawaban Benar:{" "}
                  <span className="font-bold text-white">
                    {overlayInfo.correctAnswer}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-mono">Memuat soal baru...</p>
        </div>
      )}
    </div>
  );
}