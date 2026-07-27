"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Clock,
  Loader2,
  X,
  AlertCircle,
  Shield,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

interface UserProfile {
  id: string;
  name: string;
  level: number;
}

interface TeamInfo {
  id: string;
  name: string;
  captain_id: string;
}

interface PusherChannel {
  bind: (event: string, callback: (data: unknown) => void) => void;
  unbind_all: () => void;
  unsubscribe: () => void;
}

interface PusherConnection {
  state: string;
  bind: (event: string, callback: () => void) => void;
  unbind: (event: string, callback: () => void) => void;
}

interface PusherClient {
  subscribe: (channelName: string) => PusherChannel;
  connection: PusherConnection;
}

export default function TeamMatchmakingPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowTimeoutModal(true);

    fetch("/api/battle/team/queue/cancel", { method: "POST" }).catch((err) =>
      console.error("Error auto-cancelling on timeout:", err)
    );
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}j ${minutes}m ${secs}d`;
    return `${minutes}m ${secs}d`;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [profileRes, teamRes] = await Promise.all([
          fetch("/api/battle/profile"),
          fetch("/api/battle/team/my"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          if (!teamData || teamData.id !== teamId) {
            router.replace("/murid/battle?autoRefresh=1");
            return;
          }
          if (teamData.status !== "MATCHMAKING") {
            window.location.href = `/murid/battle/team/${teamId}`;
            return;
          }
          setTeam(teamData);
        } else {
          router.replace("/murid/battle?autoRefresh=1");
        }
      } catch {
        setError("Gagal memuat data");
      }
    };

    init();
  }, [teamId, router]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setWaitingTime((prev) => {
        if (prev >= 3600) {
          handleTimeout();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleTimeout]);

  useEffect(() => {
    if (!teamId || !pusherClient) return;

    let channel: PusherChannel | null = null;
    let connectedHandler: (() => void) | null = null;

    const subscribe = () => {
      try {
        channel = (pusherClient as PusherClient).subscribe(`team-${teamId}`);

        channel.bind("match-found", (data: unknown) => {
          const matchData = data as { matchId: string };
          if (timerRef.current) clearInterval(timerRef.current);
          window.location.href = `/murid/battle/duel/${matchData.matchId}`;
        });

        channel.bind("matchmaking-cancelled", () => {
          if (timerRef.current) clearInterval(timerRef.current);
          window.location.href = `/murid/battle/team/${teamId}`;
        });

        channel.bind("team-disband", () => {
          if (timerRef.current) clearInterval(timerRef.current);
          window.location.href = `/murid/battle?autoRefresh=1`;
        });
      } catch {
        // Error handling
      }
    };

    try {
      const connState = (pusherClient as PusherClient).connection?.state;
      if (connState === "connected") {
        subscribe();
      } else {
        connectedHandler = () => {
          subscribe();
          try {
            (pusherClient as PusherClient).connection.unbind("connected", connectedHandler as () => void);
          } catch {
            // Error handling
          }
        };
        (pusherClient as PusherClient).connection.bind("connected", connectedHandler);
      }
    } catch {
      subscribe();
    }

    return () => {
      try {
        if (channel) {
          channel.unbind_all();
          channel.unsubscribe();
        }
      } catch {
        // Error handling
      }
      try {
        if (connectedHandler) {
          (pusherClient as PusherClient).connection.unbind("connected", connectedHandler);
        }
      } catch {
        // Error handling
      }
    };
  }, [teamId]);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/battle/team/queue/cancel", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membatalkan matchmaking");
        setShowCancelModal(false);
        return;
      }
    } catch {
      setError("Terjadi kesalahan saat membatalkan matchmaking");
      setShowCancelModal(false);
    } finally {
      setCancelLoading(false);
      setShowCancelModal(false);
    }
  };

  const isCaptain = team && profile && team.captain_id === profile.id;

  const dots = [".", "..", "..."];
  const [dotIdx, setDotIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotIdx((prev) => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <button
        onClick={() => router.push(`/murid/battle/team/${teamId}`)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Lobby
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200">
          <Users className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900">
          Mencari Lawan Tim
        </h2>
        {team && (
          <p className="text-emerald-700 font-bold text-base mt-1 font-mono">
            {team.name}
          </p>
        )}
        <p className="text-slate-500 text-sm mt-1">
          Mencocokkan dengan tim lain berdasarkan level rata-rata...
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-2xs text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-emerald-100 animate-ping opacity-40" />
          <div className="absolute w-20 h-20 rounded-full bg-emerald-200 animate-pulse opacity-60" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-mono text-lg font-bold text-slate-900">
            Mencari Tim Lawan{dots[dotIdx]}
          </p>
          <p className="text-sm text-slate-500">Sistem mencocokkan level rata-rata tim Anda</p>
        </div>

        <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="font-mono text-xl font-bold text-slate-700">
            {formatTime(waitingTime)}
          </span>
          <span className="text-xs text-slate-400 font-mono">/ 1j 0m 0d</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((waitingTime / 3600) * 100, 100)}%` }}
          />
        </div>

        {isCaptain && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-5 py-2.5 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-sm font-mono font-bold"
          >
            Batalkan Pencarian
          </button>
        )}
        {!isCaptain && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <Shield className="w-3.5 h-3.5" />
            Hanya kapten yang dapat membatalkan matchmaking
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700 mb-1">Info Team Battle:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Matchmaking diprioritaskan berdasarkan level rata-rata tim</li>
          <li>Tim dari PT berbeda bisa saling bertemu</li>
          <li>Timeout otomatis setelah 1 jam jika tidak ada lawan</li>
          <li>Semua anggota tim akan diarahkan otomatis ke arena</li>
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Batalkan Matchmaking?
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Apakah Anda yakin ingin membatalkan pencarian lawan? Semua anggota tim akan dikembalikan ke lobby.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold cursor-pointer"
              >
                Lanjutkan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-mono text-sm font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Batalkan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimeoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Pencarian Habis Waktu
              </h3>
              <button
                onClick={() => setShowTimeoutModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
              <p className="text-sm text-amber-700 leading-relaxed">
                Tidak ada tim lawan dengan level yang cocok ditemukan dalam 1 jam. Kemungkinan saat ini tidak ada tim lain yang sedang mencari pertandingan pada level yang sama.
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Coba lagi nanti, atau ajak lebih banyak teman untuk bermain!
            </p>
            <button
              onClick={() => router.push(`/murid/battle/team/${teamId}`)}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
            >
              Kembali ke Lobby Tim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}