"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Award,
  History,
  Settings,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Sword,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Shield,
  Mail,
} from "lucide-react";

interface UserStats {
  id: string;
  username: string;
  name: string;
  role: string;
  class_name: string | null;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

interface MatchHistory {
  id: string;
  opponent_name: string;
  result: "WIN" | "LOSE" | "DRAW";
  exp_change: number;
  money_change: number;
  created_at: string;
}

export default function ProfileContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "profile";

  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPasswordResult, setShowPasswordResult] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user stats
      const statsRes = await fetch("/api/sekretaris/profile/stats");
      if (!statsRes.ok) throw new Error("Gagal mengambil data profil");
      const statsData = await statsRes.json();
      setStats(statsData);

      // Get match history
      const historyRes = await fetch("/api/sekretaris/profile/history");
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
      setError("Gagal memuat data profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getExpPercentage = (exp: number, level: number): number => {
    const maxExp = level * 10;
    return Math.min((exp / maxExp) * 100, 100);
  };

  const generateRandomPassword = async () => {
    try {
      const res = await fetch("/api/guru/generate-password");
      const data = await res.json();
      setGeneratedPassword(data.password);
      setShowPasswordResult(true);
      setPasswordCopied(false);
    } catch (err) {
      console.error("Error generating password:", err);
      alert("Gagal generate password");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert("Password minimal 4 karakter");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/sekretaris/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal mengubah password");
        return;
      }

      setShowPasswordModal(false);
      setNewPassword("");
      setShowNewPassword(false);
      alert("Password berhasil diubah!");
    } catch (err) {
      console.error("Error changing password:", err);
      alert("Terjadi kesalahan saat mengubah password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
  };

  const closePasswordResult = () => {
    setShowPasswordResult(false);
    setGeneratedPassword("");
    setPasswordCopied(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 w-40 bg-slate-200 rounded"></div>
              <div className="h-4 w-24 bg-slate-200 rounded mt-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h3>
        <p className="text-slate-500 text-center max-w-md">{error || "Data tidak ditemukan"}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const balance = stats.income - stats.expense;
  const expPercentage = getExpPercentage(stats.exp, stats.level);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-mono font-bold shadow-lg">
              {stats.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-2xl font-bold text-slate-900">
                {stats.name}
              </h2>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-mono font-bold rounded">
                {stats.role}
              </span>
              {stats.class_name && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded">
                  {stats.class_name}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">@{stats.username}</p>
            <p className="text-xs text-slate-400 mt-1">
              Bergabung {formatDate(stats.created_at)}
            </p>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-mono font-bold"
          >
            <Settings className="w-4 h-4" />
            Ganti Password
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => router.push("/sekretaris/profile?tab=profile")}
          className={`px-4 py-2 text-sm font-mono font-bold transition-colors border-b-2 whitespace-nowrap ${
            tab === "profile"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profile
        </button>
        <button
          onClick={() => router.push("/sekretaris/profile?tab=stats")}
          className={`px-4 py-2 text-sm font-mono font-bold transition-colors border-b-2 whitespace-nowrap ${
            tab === "stats"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Award className="w-4 h-4 inline mr-2" />
          Statistik
        </button>
        <button
          onClick={() => router.push("/sekretaris/profile?tab=history")}
          className={`px-4 py-2 text-sm font-mono font-bold transition-colors border-b-2 whitespace-nowrap ${
            tab === "history"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          Riwayat
        </button>
      </div>

      {/* Tab Content */}
      {tab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              Informasi Diri
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Nama</span>
                <span className="text-sm font-medium text-slate-900">{stats.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Username</span>
                <span className="text-sm font-medium text-slate-900">@{stats.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Role</span>
                <span className="text-sm font-medium text-purple-600">{stats.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">PT</span>
                <span className="text-sm font-medium text-slate-900">{stats.class_name || "-"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-500">Bergabung</span>
                <span className="text-sm font-medium text-slate-900">{formatDate(stats.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sword className="w-4 h-4 text-purple-600" />
              Ringkasan Battle
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-emerald-600">Menang</p>
                <p className="font-mono text-2xl font-bold text-emerald-600">{stats.wins}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-red-600">Kalah</p>
                <p className="font-mono text-2xl font-bold text-red-600">{stats.losses}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-purple-600">Win Rate</p>
                <p className="font-mono text-2xl font-bold text-purple-600">
                  {stats.wins + stats.losses > 0 
                    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
                    : 0}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-slate-600">Total Battle</p>
                <p className="font-mono text-2xl font-bold text-slate-900">{stats.wins + stats.losses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs md:col-span-2">
            <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-600" />
              Keuangan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-emerald-600">Pemasukan</p>
                <p className="font-mono text-sm font-bold text-emerald-600">{formatCurrency(stats.income)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-[10px] font-mono text-red-600">Pengeluaran</p>
                <p className="font-mono text-sm font-bold text-red-600">{formatCurrency(stats.expense)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${
                balance >= 0 ? "bg-blue-50" : "bg-amber-50"
              }`}>
                <p className={`text-[10px] font-mono ${balance >= 0 ? "text-blue-600" : "text-amber-600"}`}>Saldo</p>
                <p className={`font-mono text-sm font-bold ${balance >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                  {formatCurrency(balance < 0 ? 0 : balance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Level & EXP
            </h4>
            <div className="text-center py-4">
              <p className="font-mono text-5xl font-bold text-purple-600">{stats.level}</p>
              <p className="text-xs text-slate-500 mt-1">Level</p>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span className="font-mono">EXP Progress</span>
                <span className="font-mono">{stats.exp} / {stats.level * 10}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500 rounded-full"
                  style={{ width: `${expPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">
                {Math.round(expPercentage)}% menuju level {stats.level + 1}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Pencapaian
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-700">Total Battle</span>
                <span className="font-mono font-bold text-slate-900">{stats.wins + stats.losses}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-700">Win Rate</span>
                <span className={`font-mono font-bold ${
                  stats.wins + stats.losses > 0 && (stats.wins / (stats.wins + stats.losses)) >= 0.5
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}>
                  {stats.wins + stats.losses > 0 
                    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-700">Total EXP</span>
                <span className="font-mono font-bold text-purple-600">{stats.exp}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-700">Total Saldo</span>
                <span className={`font-mono font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(balance < 0 ? 0 : balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <h4 className="font-mono text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Riwayat Battle
          </h4>

          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Sword className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Belum ada riwayat battle</p>
              <p className="text-xs text-slate-400">Mulai battle untuk melihat riwayat di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    match.result === "WIN"
                      ? "bg-emerald-50 border-emerald-200"
                      : match.result === "LOSE"
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      match.result === "WIN"
                        ? "bg-emerald-200 text-emerald-700"
                        : match.result === "LOSE"
                        ? "bg-red-200 text-red-700"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {match.result === "WIN" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : match.result === "LOSE" ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        vs {match.opponent_name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {formatDate(match.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-bold ${
                      match.result === "WIN" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {match.result === "WIN" ? "+" : ""}{match.exp_change} EXP
                    </p>
                    <p className={`text-xs font-mono ${
                      match.result === "WIN" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {match.result === "WIN" ? "+" : ""}{formatCurrency(match.money_change)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Ganti Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Password baru akan digunakan untuk login akun Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono pr-10"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={generateRandomPassword}
                    className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1 text-sm font-mono font-bold text-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Acak
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {newPassword.length < 4 && newPassword.length > 0 
                    ? `Password minimal 4 karakter (${newPassword.length}/4)` 
                    : newPassword.length >= 4 
                      ? `Password valid (${newPassword.length} karakter)` 
                      : "Minimal 4 karakter"}
                </p>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={passwordLoading || newPassword.length < 4}
                className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                ) : null}
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESULT MODAL */}
      {showPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-emerald-600">
                Password Baru
              </h3>
              <button
                onClick={closePasswordResult}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700 font-medium">
                  Password berhasil digenerate!
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Silakan salin password berikut untuk digunakan.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-mono text-xl font-bold text-slate-900 text-center tracking-wider select-all">
                  {generatedPassword}
                </p>
              </div>

              {passwordCopied ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">
                    Password berhasil disalin!
                  </p>
                </div>
              ) : (
                <button
                  onClick={copyPasswordToClipboard}
                  className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-mono text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Password
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (!passwordCopied) {
                    if (!confirm("Password belum disalin. Yakin ingin menutup?")) return;
                  }
                  closePasswordResult();
                }}
                className={`flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold ${
                  passwordCopied ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600" : ""
                }`}
              >
                {passwordCopied ? "Selesai" : "Tutup"}
              </button>
              {passwordCopied && (
                <button
                  onClick={closePasswordResult}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}