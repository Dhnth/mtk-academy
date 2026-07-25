"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Shield,
  RefreshCw,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

type ModalType =
  | { type: "success"; teamName: string; teamCode: string; teamId: string }
  | { type: "error"; message: string };

export default function CreateTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType | null>(null);

  const handleCreate = async () => {
    if (!teamName.trim()) {
      setError("Nama tim wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/battle/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat tim");
        return;
      }

      setModal({
        type: "success",
        teamName: teamName.trim(),
        teamCode: data.code,
        teamId: data.teamId,
      });
    } catch {
      setError("Terjadi kesalahan saat membuat tim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Users className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900">
          Buat Tim Baru
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Buat tim untuk bertarung 4v4 dengan teman-teman Anda!
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
              Nama Tim
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Contoh: Team Alpha"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Nama tim akan ditampilkan di leaderboard
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Membuat...
              </>
            ) : (
              "Buat Tim"
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-bold">Info Tim:</p>
            <ul className="space-y-1 mt-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600"/> Maksimal 4 anggota per tim</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600"/> Kapten bisa mengundang dengan kode tim</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600"/> Battle tim dilakukan 4v4</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600"/> Semua anggota harus dari PT yang sama</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {modal?.type === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-mono text-lg font-bold text-slate-900 mb-1">
              Tim Berhasil Dibuat!
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Bagikan kode berikut kepada teman agar bisa bergabung ke tim{" "}
              <span className="font-bold text-purple-700">{modal.teamName}</span>.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-1">
                Kode Tim
              </p>
              <p className="font-mono text-3xl font-black text-purple-700 tracking-widest">
                {modal.teamCode}
              </p>
            </div>
            <button
              onClick={() => router.push(`/sekretaris/battle/team/${modal.teamId}`)}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-mono text-sm font-bold"
            >
              Masuk Lobby Tim
            </button>
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