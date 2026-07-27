"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  User,
  Shield,
  Copy,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Swords,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_username: string;
  joined_at: string;
  level?: number;
}

interface TeamData {
  id: string;
  code: string;
  name: string;
  captain_id: string;
  class_id: string;
  status: string;
  active_match_id?: string | null;
  members: TeamMember[];
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  level: number;
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

type ModalType =
  | { type: "confirm_disband" }
  | { type: "confirm_leave" }
  | { type: "confirm_start" }
  | { type: "disbanded" }
  | { type: "error"; message: string };

export default function TeamLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<ModalType | null>(null);

  const fetchTeamData = useCallback(async () => {
    try {
      const profileRes = await fetch("/api/battle/profile");
      if (!profileRes.ok) throw new Error("Gagal mengambil profil");
      const profileData = await profileRes.json();
      setProfile(profileData);

      const res = await fetch("/api/battle/team/my");
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/murid/battle");
          return;
        }
        throw new Error("Gagal memuat data tim");
      }
      const data = await res.json();
      if (!data || data.id !== teamId) {
        if (data) {
          router.replace(`/murid/battle/team/${data.id}`);
        } else {
          router.replace("/murid/battle");
        }
        return;
      }
      
      if (data.status === "MATCHMAKING") {
        window.location.href = `/murid/battle/team/${teamId}/match`;
        return;
      }

      if (data.status === "IN_BATTLE" && data.active_match_id) {
        window.location.href = `/murid/battle/duel/${data.active_match_id}`;
        return;
      }

      setTeam(data);
    } catch {
      setError("Gagal memuat data tim");
    } finally {
      setLoading(false);
    }
  }, [teamId, router]);

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    if (!team?.id || !pusherClient) return;

    let channel: PusherChannel | null = null;
    let connectedHandler: (() => void) | null = null;

    const subscribe = () => {
      try {
        channel = (pusherClient as PusherClient).subscribe(`team-${team.id}`);

        channel.bind("team-update", () => {
          fetchTeamData();
        });

        channel.bind("team-disband", () => {
          router.replace("/murid/battle?autoRefresh=1");
        });

        channel.bind("matchmaking-started", () => {
          window.location.href = `/murid/battle/team/${team.id}/match`;
        });

        channel.bind("match-found", (data: unknown) => {
          const matchData = data as { matchId: string };
          window.location.href = `/murid/battle/duel/${matchData.matchId}`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const copyTeamCode = () => {
    if (team) {
      navigator.clipboard.writeText(team.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisbandTeam = async () => {
    setActionLoading(true);
    setModal(null);
    try {
      const res = await fetch("/api/battle/team/disband", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setModal({ type: "error", message: data.error || "Gagal membubarkan tim" });
        return;
      }
      router.replace("/murid/battle?autoRefresh=1");
    } catch {
      setModal({ type: "error", message: "Terjadi kesalahan saat membubarkan tim" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    setActionLoading(true);
    setModal(null);
    try {
      const res = await fetch("/api/battle/team/leave", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setModal({ type: "error", message: data.error || "Gagal keluar dari tim" });
        return;
      }
      router.replace("/murid/battle?autoRefresh=1");
    } catch {
      setModal({ type: "error", message: "Terjadi kesalahan saat keluar dari tim" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMatchmaking = async () => {
    setActionLoading(true);
    setModal(null);
    
    try {
      const res = await fetch("/api/battle/team/queue", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();

      if (!res.ok) {
        console.error("Matchmaking error response:", data);
        setModal({ 
          type: "error", 
          message: data.error || "Gagal memulai matchmaking" 
        });
        setActionLoading(false);
        return;
      }

      console.log("Matchmaking success:", data);

      if (data.matchId) {
        window.location.href = `/murid/battle/duel/${data.matchId}`;
      } else if (data.teamId) {
        window.location.href = `/murid/battle/team/${data.teamId}/match`;
      } else {
        window.location.href = `/murid/battle/team/${teamId}/match`;
      }
    } catch (err) {
      console.error("Error starting matchmaking:", err);
      setModal({ 
        type: "error", 
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat memulai matchmaking" 
      });
      setActionLoading(false);
    }
  };

  const onStartClick = () => {
    if (!team) return;
    console.log("Team members count:", team.members.length);
    
    if (team.members.length < 4) {
      console.log("Team not full, showing confirm modal");
      setModal({ type: "confirm_start" });
    } else {
      console.log("Team full, starting matchmaking");
      handleStartMatchmaking();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Tim</h3>
        <p className="text-slate-500 text-center">{error || "Tim tidak ditemukan"}</p>
        <button
          onClick={() => router.push("/murid/battle")}
          className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
        >
          Kembali ke Battle
        </button>
      </div>
    );
  }

  const isCaptain = team.captain_id === profile?.id;
  const avgLevel =
    Math.round(
      team.members.reduce((acc, m) => acc + (m.level || 1), 0) /
        team.members.length
    ) || 1;

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <button
        onClick={() => router.push("/murid/battle")}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Battle
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200">
          <Users className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900 leading-tight">
          Lobby Tim
        </h2>
        <p className="text-emerald-700 font-bold text-lg mt-1 font-mono">
          {team.name}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Kode Tim (Bagikan ke Teman)
            </p>
            <p className="text-xl font-bold font-mono text-emerald-600 tracking-widest mt-0.5">
              {team.code}
            </p>
          </div>
          <button
            onClick={copyTeamCode}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-emerald-600 transition-all flex items-center gap-1.5 text-xs font-mono font-semibold"
            title="Salin Kode"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Salin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
            Anggota Tim ({team.members.length}/4)
          </span>
          <span className="text-xs font-mono text-slate-400">
            Rata-rata Lvl: {avgLevel}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
          {Array.from({ length: 4 }).map((_, idx) => {
            const member = team.members[idx];
            if (member) {
              const memberIsCaptain = member.user_id === team.captain_id;
              return (
                <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        memberIsCaptain
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {memberIsCaptain ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1.5">
                        {member.user_name}
                        {member.user_id === profile?.id && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-mono font-normal">
                            Anda
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        @{member.user_username}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-500 shrink-0">
                    Lvl {member.level || 1}
                  </span>
                </div>
              );
            } else {
              return (
                <div
                  key={`empty-${idx}`}
                  className="p-4 flex items-center justify-center gap-2 border-dashed bg-slate-50/50"
                >
                  <span className="text-xs font-mono text-slate-400">
                    Menunggu anggota bergabung...
                  </span>
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {isCaptain ? (
          <>
            <button
              onClick={onStartClick}
              disabled={actionLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-mono text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  Mulai Matchmaking 4v4
                </>
              )}
            </button>
            <button
              onClick={() => setModal({ type: "confirm_disband" })}
              disabled={actionLoading}
              className="w-full py-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-mono text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Bubarkan Tim
            </button>
          </>
        ) : (
          <>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 font-mono">
              Menunggu kapten memulai matchmaking...
            </div>
            <button
              onClick={() => setModal({ type: "confirm_leave" })}
              disabled={actionLoading}
              className="w-full py-3 border border-amber-200 hover:bg-amber-50 text-amber-600 rounded-xl font-mono text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Tim
            </button>
          </>
        )}
      </div>

      {modal?.type === "confirm_disband" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Bubarkan Tim?
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Semua anggota akan otomatis dikeluarkan dari tim{" "}
              <span className="font-bold text-slate-800">{team.name}</span>.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDisbandTeam}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-mono text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Bubarkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "confirm_leave" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-amber-600 flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                Keluar dari Tim?
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Apakah Anda yakin ingin keluar dari tim{" "}
              <span className="font-bold text-slate-800">{team.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-mono text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "confirm_start" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Anggota Belum Lengkap
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Jumlah anggota tim Anda saat ini baru{" "}
              <span className="font-bold text-emerald-700">
                {team.members.length}/4 orang
              </span>
              . Apakah Anda yakin ingin memulai matchmaking dengan anggota yang ada?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleStartMatchmaking}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Tetap Mulai"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "disbanded" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-mono text-lg font-bold text-slate-900 mb-2">
              Tim Telah Dibubarkan
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Kapten telah membubarkan tim. Anda akan dikembalikan ke halaman Battle.
            </p>
            <button
              onClick={() => router.replace("/murid/battle?autoRefresh=1")}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
            >
              Kembali ke Battle
            </button>
          </div>
        </div>
      )}

      {modal?.type === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Terjadi Kesalahan
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">{modal.message}</p>
            <button
              onClick={() => setModal(null)}
              className="w-full px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors font-mono text-sm font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}