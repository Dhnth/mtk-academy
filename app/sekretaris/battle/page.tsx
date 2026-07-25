"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  Users,
  User,
  Shield,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  LogOut,
  Trash2,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

type ModalType =
  | { type: "confirm_leave" }
  | { type: "confirm_disband" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

interface UserProfile {
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

interface TeamData {
  id: string;
  code: string;
  name: string;
  captain_id: string;
  class_id: string;
  status: string;
  active_match_id?: string | null;
  members: {
    id: string;
    user_id: string;
    user_name: string;
    user_username: string;
    joined_at: string;
  }[];
  created_at: string;
}

// Type for Pusher channel
interface PusherChannel {
  bind: (event: string, callback: (data: unknown) => void) => void;
  unbind_all: () => void;
  unsubscribe: () => void;
}

// Type for Pusher connection
interface PusherConnection {
  state: string;
  bind: (event: string, callback: () => void) => void;
  unbind: (event: string, callback: () => void) => void;
}

// Type for Pusher client
interface PusherClient {
  subscribe: (channelName: string) => PusherChannel;
  connection: PusherConnection;
}

export default function BattlePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myTeam, setMyTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user profile
      const profileRes = await fetch("/api/battle/profile");
      if (!profileRes.ok) throw new Error("Gagal mengambil profil");
      const profileData = await profileRes.json();
      setProfile(profileData);

      // Get user's team (if any)
      const teamRes = await fetch("/api/battle/team/my");
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        if (teamData) {
          if (teamData.status === "MATCHMAKING") {
            window.location.href = `/sekretaris/battle/team/${teamData.id}/match`;
            return;
          }
          if (teamData.status === "IN_BATTLE" && teamData.active_match_id) {
            window.location.href = `/sekretaris/battle/duel/${teamData.active_match_id}`;
            return;
          }
        }
        setMyTeam(teamData);
      }
    } catch (err) {
      console.error("Error fetching battle data:", err);
      setError("Gagal memuat data. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh once when entering lobby to ensure realtime subscriptions initialize.
  // If redirected here with ?autoRefresh=1, force a single reload then remove param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "battleLobbyAutoRefreshed";
    try {
      const params = new URLSearchParams(window.location.search);
      const wantsAuto = params.get("autoRefresh") === "1";

      if (wantsAuto) {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          // Replace to URL without query and reload there
          const newUrl = window.location.pathname;
          window.location.replace(newUrl);
        } else {
          // already refreshed previously; clean URL without reload
          history.replaceState(null, "", window.location.pathname);
        }
        return;
      }

      // fallback: on first-ever visit, do one reload to initialize subscriptions
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setTimeout(() => window.location.reload(), 50);
      }
    } catch {
      // ignore
    }
    // run only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!myTeam?.id || !pusherClient) return;

    let channel: PusherChannel | null = null;
    let connectedHandler: (() => void) | null = null;

    const subscribe = () => {
      try {
        channel = (pusherClient as PusherClient).subscribe(`team-${myTeam.id}`);

        channel.bind("matchmaking-started", () => {
          window.location.href = `/sekretaris/battle/team/${myTeam.id}/match`;
        });

        channel.bind("match-found", (data: unknown) => {
          const matchData = data as { matchId: string };
          window.location.href = `/sekretaris/battle/duel/${matchData.matchId}`;
        });

        channel.bind("team-disband", () => {
          // If team is disbanded, clear local state and ensure UI updates.
          setMyTeam(null);
          // If user somehow is viewing the team page, navigate them back to battle.
          try {
            router.replace("/sekretaris/battle?autoRefresh=1");
          } catch {
            /* noop */
          }
        });

        channel.bind("team-update", () => {
          fetchData();
        });
      } catch (e) {
        console.error("Pusher subscribe error:", e);
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
            /* noop */
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
        /* noop */
      }
      try {
        if (connectedHandler) {
          (pusherClient as PusherClient).connection.unbind("connected", connectedHandler);
        }
      } catch {
        /* noop */
      }
    };
  }, [myTeam?.id, router]);

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      setJoinError("Masukkan kode tim");
      return;
    }

    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/battle/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: teamCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinError(data.error || "Gagal bergabung ke tim");
        return;
      }

      setShowJoinModal(false);
      setTeamCode("");
      router.push(`/sekretaris/battle/team/${data.teamId}`);
    } catch {
      setJoinError("Terjadi kesalahan saat bergabung ke tim");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    setModal(null);
    try {
      const res = await fetch("/api/battle/team/leave", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setModal({ type: "error", message: data.error || "Gagal keluar dari tim" });
        return;
      }

      await fetchData();
    } catch {
      setModal({ type: "error", message: "Terjadi kesalahan saat keluar dari tim" });
    }
  };

  const handleDisbandTeam = async () => {
    setModal(null);
    try {
      const res = await fetch("/api/battle/team/disband", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setModal({ type: "error", message: data.error || "Gagal membubarkan tim" });
        return;
      }

      await fetchData();
    } catch {
      setModal({ type: "error", message: "Terjadi kesalahan saat membubarkan tim" });
    }
  };

  const copyTeamCode = () => {
    if (myTeam) {
      navigator.clipboard.writeText(myTeam.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-200 rounded mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 h-48">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
            <div className="h-12 w-32 bg-slate-200 rounded-xl"></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 h-48">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
            <div className="h-12 w-32 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const isInTeam = myTeam !== null;
  const isCaptain = myTeam && myTeam.captain_id === profile?.id;
  const isTeamFull = myTeam && myTeam.members.length >= 4;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Arena Battle
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            {profile 
              ? `Level ${profile.level} • ${profile.wins}W/${profile.losses}L`
              : "Siap bertempur!"}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-purple-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Summary */}
      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">{profile.name}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-mono">@{profile.username}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono">Level {profile.level}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-emerald-600">
                {formatCurrency(profile.income - profile.expense < 0 ? 0 : profile.income - profile.expense)}
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-mono">
                {profile.class_name || "Belum ada PT"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-600 font-bold">W: {profile.wins}</span>
            <span className="text-rose-600 font-bold">L: {profile.losses}</span>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Solo Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Swords className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-mono font-bold text-slate-900">Solo Duel</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Lawan pemain lain secara 1v1. Dapatkan EXP dan uang jika menang!
          </p>
          <button
            onClick={() => router.push("/sekretaris/battle/solo")}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
          >
            Cari Lawan
          </button>
        </div>

        {/* Team Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-mono font-bold text-slate-900">Team Battle</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Buat atau bergabung dengan tim untuk bertarung 4v4!
          </p>

          {isInTeam ? (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="font-mono text-xs font-bold text-slate-500 mb-1">
                  Anda berada di tim:
                </p>
                <p className="font-bold text-purple-700 text-lg mb-2">
                  {myTeam.name}
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  {myTeam.members.length}/4 anggota • Kode: <span className="font-mono font-bold text-purple-600">{myTeam.code}</span>
                </p>
                <button
                  onClick={() => router.push(`/sekretaris/battle/team/${myTeam.id}`)}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-mono font-bold transition-colors"
                >
                  Masuk Halaman Tim
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => router.push("/sekretaris/battle/team/create")}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-mono text-sm font-bold"
              >
                Buat Tim
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors font-mono text-sm font-bold"
              >
                + Gabung Tim dengan Kode
              </button>
            </div>
          )}
        </div>
      </div>

      {/* JOIN TEAM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Gabung ke Tim
              </h3>
              <button
                onClick={() => { setShowJoinModal(false); setJoinError(null); setTeamCode(""); }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Kode Tim
                </label>
                <input
                  type="text"
                  value={teamCode}
                  onChange={(e) => { setTeamCode(e.target.value.toUpperCase()); setJoinError(null); }}
                  placeholder="Contoh: ABCD12"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono uppercase"
                  maxLength={10}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinTeam()}
                />
                {joinError ? (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{joinError}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Masukkan kode tim yang diberikan oleh kapten tim
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowJoinModal(false); setJoinError(null); setTeamCode(""); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleJoinTeam}
                  disabled={joinLoading || !teamCode.trim()}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {joinLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Gabung"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Leave Modal */}
      {modal?.type === "confirm_leave" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-amber-600 flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                Keluar dari Tim?
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">Apakah Anda yakin ingin keluar dari tim <span className="font-bold text-slate-800">{myTeam?.name}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-mono text-sm font-bold cursor-pointer">Batal</button>
              <button onClick={handleLeaveTeam} className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-mono text-sm font-bold cursor-pointer">Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Disband Modal */}
      {modal?.type === "confirm_disband" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Bubarkan Tim?
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">Semua anggota akan dikeluarkan dari tim <span className="font-bold text-slate-800">{myTeam?.name}</span>. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-mono text-sm font-bold cursor-pointer">Batal</button>
              <button onClick={handleDisbandTeam} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-mono text-sm font-bold cursor-pointer">Bubarkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {modal?.type === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Terjadi Kesalahan
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">{modal.message}</p>
            <button onClick={() => setModal(null)} className="w-full px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-mono text-sm font-bold cursor-pointer">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}