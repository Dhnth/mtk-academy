"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Building2,
  TrendingUp,
  Wallet,
  RefreshCw,
  AlertCircle,
  User,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  UserCog,
  BarChart3,
  ArrowUpCircle,
  Sparkles,
  Zap,
  X,
} from "lucide-react";

interface MuridProfile {
  id: string;
  name: string;
  username: string;
  role: string;
  class_id: string | null;
  class_name: string | null;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
}

interface ClassSummary {
  id: string;
  name: string;
  studentCount: number;
  totalIncome: number;
  totalExpense: number;
}

interface DashboardData {
  profile: MuridProfile;
  classSummary: ClassSummary[];
  recentActivities: {
    id: string;
    type: string;
    message: string;
    created_at: string;
  }[];
  levelUp?: boolean;
}

interface ModalData {
  isOpen: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function MuridPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingLevel, setUpdatingLevel] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [modal, setModal] = useState<ModalData>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showModal = (
    title: string,
    message: string,
    type: ModalData["type"] = "info",
  ) => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: "", message: "", type: "info" });
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLevelUpMessage(null);
    try {
      const res = await fetch("/api/murid/dashboard");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      setData(json);

      if (json.levelUp) {
        setLevelUpMessage(`Level naik ke ${json.profile.level}!`);
        setShowLevelUpAnimation(true);
        setTimeout(() => setShowLevelUpAnimation(false), 5000);
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Gagal memuat data dashboard. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const handleUpdateLevel = async () => {
    if (updatingLevel) return;
    setUpdatingLevel(true);
    setLevelUpMessage(null);

    try {
      const res = await fetch("/api/murid/update-level", {
        method: "POST",
      });
      const result = await res.json();

      if (!res.ok) {
        showModal("Gagal", result.error || "Gagal update level", "error");
        return;
      }

      if (result.leveledUp) {
        setLevelUpMessage(`Selamat! Level naik ke ${result.level}!`);
        setShowLevelUpAnimation(true);
        setTimeout(() => setShowLevelUpAnimation(false), 5000);
        await fetchDashboardData();
        showModal(
          "Berhasil!",
          `Level berhasil naik ke ${result.level}!`,
          "success",
        );
      } else {
        const needed = result.neededExp - result.exp;
        showModal(
          "EXP Belum Cukup",
          `EXP: ${result.exp}/${result.neededExp} (butuh ${needed} EXP lagi untuk naik level)`,
          "warning",
        );
      }
    } catch (err) {
      console.error("Error updating level:", err);
      showModal("Error", "Terjadi kesalahan saat update level", "error");
    } finally {
      setUpdatingLevel(false);
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

  const getExpPercentage = (exp: number, level: number): number => {
    const maxExp = level * 100;
    return Math.min((exp / maxExp) * 100, 100);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-200 rounded mt-2"></div>
          </div>
          <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 w-32 bg-slate-200 rounded"></div>
              <div className="h-4 w-48 bg-slate-200 rounded mt-1"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Gagal Memuat Data
        </h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <User className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Belum Ada Data
        </h3>
        <p className="text-slate-500 text-center max-w-md">
          Belum ada data yang tersedia.
        </p>
      </div>
    );
  }

  const { profile, classSummary } = data;
  const balance = profile.income - profile.expense;
  const expPercentage = getExpPercentage(profile.exp, profile.level);
  const nextLevelExp = profile.level * 100;

  return (
    <div className="space-y-6">
      {/* Level Up Animation */}
      {showLevelUpAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <ArrowUpCircle className="w-8 h-8 text-emerald-600" />
              </div>

              {/* Title */}
              <h2 className="font-mono text-2xl font-bold text-slate-900">
                Level Up!
              </h2>

              {/* Level */}
              <p className="font-mono text-4xl font-bold text-emerald-600 mt-2">
                {profile.level}
              </p>
              <p className="text-sm text-slate-500 mt-1">Level baru Anda</p>

              {/* Divider */}
              <div className="w-12 h-0.5 bg-emerald-200 mx-auto my-4" />

              {/* Message */}
              <p className="text-sm text-slate-600">
                Selamat! Anda telah mencapai level {profile.level}.
              </p>

              {/* Button */}
              <button
                onClick={() => setShowLevelUpAnimation(false)}
                className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono text-sm font-bold transition-colors cursor-pointer"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Message */}
      {levelUpMessage && !showLevelUpAnimation && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            levelUpMessage.includes("naik")
              ? "bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 text-amber-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <Zap
            className={`w-5 h-5 ${levelUpMessage.includes("naik") ? "text-amber-500" : "text-blue-500"}`}
          />
          <p className="text-sm font-medium">{levelUpMessage}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Murid
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau progres belajarmu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateLevel}
            disabled={updatingLevel}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors text-xs font-mono font-bold disabled:opacity-50 shadow-sm"
          >
            <ArrowUpCircle
              className={`w-4 h-4 ${updatingLevel ? "animate-spin" : ""}`}
            />
            Update Level
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 transition-all"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <UserCog className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-xl font-bold text-slate-900">
                {profile.name}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-mono font-bold rounded">
                {profile.role}
              </span>
              {profile.class_name && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-mono font-bold rounded flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {profile.class_name}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">@{profile.username}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm bg-white/70 rounded-xl px-4 py-2 border border-slate-100">
            <div className="text-center">
              <p className="text-[10px] font-mono text-slate-500">Level</p>
              <p className="font-mono text-lg font-bold text-slate-900">
                {profile.level}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-slate-500">EXP</p>
              <p className="font-mono text-sm font-bold text-slate-900">
                {profile.exp} / {nextLevelExp}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-slate-500">Saldo</p>
              <p
                className={`font-mono text-sm font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {formatCurrency(balance < 0 ? 0 : balance)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-emerald-600 font-bold">
                W: {profile.wins}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-rose-600 font-bold">
                L: {profile.losses}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="font-mono">Progress EXP</span>
            <span className="font-mono">{Math.round(expPercentage)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${expPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Karyawan
            </p>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {classSummary.reduce((sum, c) => sum + c.studentCount, 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-400">Total di PT</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Total Saldo PT
            </p>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-sm font-bold text-emerald-600 mt-1 truncate">
            {formatCurrency(
              classSummary.reduce(
                (sum, c) =>
                  sum +
                  (c.totalIncome - c.totalExpense < 0
                    ? 0
                    : c.totalIncome - c.totalExpense),
                0,
              ),
            )}
          </p>
          <p className="text-[10px] font-mono text-slate-400">Gabungan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              PT Aktif
            </p>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {classSummary.length}
          </p>
          <p className="text-[10px] font-mono text-slate-400">Unit Berjalan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Win Rate
            </p>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {profile.wins + profile.losses > 0
              ? Math.round(
                  (profile.wins / (profile.wins + profile.losses)) * 100,
                )
              : 0}
            %
          </p>
          <p className="text-[10px] font-mono text-slate-400">Menang</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Ringkasan PT
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {classSummary.length} unit
          </span>
        </div>

        {classSummary.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Belum terdaftar di PT mana pun</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classSummary.map((cls) => {
              const balance = cls.totalIncome - cls.totalExpense;
              const isPositive = balance >= 0;
              return (
                <div
                  key={cls.id}
                  className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-mono font-bold text-slate-900 text-sm">
                          {cls.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Users className="w-3 h-3" />
                          <span>{cls.studentCount} karyawan</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono text-sm font-bold ${isPositive ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        {formatCurrency(isPositive ? balance : 0)}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[10px]">
                        <span className="text-emerald-500">
                          ↑ {formatCurrency(cls.totalIncome)}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-rose-500">
                          ↓ {formatCurrency(cls.totalExpense)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data.recentActivities && data.recentActivities.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Aktivitas Terbaru
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {data.recentActivities.length} aktivitas
            </span>
          </div>

          <div className="space-y-2">
            {data.recentActivities.map((activity, index) => {
              const isFirst = index === 0;
              return (
                <div
                  key={activity.id}
                  className={`p-3 rounded-xl flex items-start gap-3 transition-colors ${
                    isFirst
                      ? "bg-emerald-50/80 border border-emerald-100"
                      : "bg-slate-50/80 border border-slate-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isFirst
                        ? "bg-emerald-200 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isFirst ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">{activity.message}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  {isFirst && (
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-700 text-[9px] font-mono font-bold rounded">
                      Baru
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`font-mono text-lg font-bold ${
                  modal.type === "success"
                    ? "text-emerald-600"
                    : modal.type === "error"
                      ? "text-red-600"
                      : modal.type === "warning"
                        ? "text-amber-600"
                        : "text-blue-600"
                }`}
              >
                {modal.title}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div
              className={`p-4 rounded-xl mb-5 ${
                modal.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : modal.type === "error"
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : modal.type === "warning"
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
              }`}
            >
              <div className="flex items-start gap-3">
                {modal.type === "success" && (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {modal.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                {modal.type === "warning" && (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                {modal.type === "info" && (
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {modal.message}
                </p>
              </div>
            </div>

            <button
              onClick={closeModal}
              className={`w-full px-4 py-2.5 rounded-lg transition-colors font-mono text-sm font-bold ${
                modal.type === "success"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : modal.type === "error"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : modal.type === "warning"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
