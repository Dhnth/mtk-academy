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
  Clock,
  CheckCircle,
  XCircle,
  UserCog,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";

interface SekretarisProfile {
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

interface TodayAttendance {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  disPen: number;
}

interface DashboardData {
  profile: SekretarisProfile;
  classSummary: ClassSummary[];
  todayAttendance: TodayAttendance;
  recentActivities: {
    id: string;
    type: string;
    message: string;
    created_at: string;
  }[];
}

export default function SekretarisPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sekretaris/dashboard");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      setData(json);
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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getExpPercentage = (exp: number, level: number): number => {
    const maxExp = level * 10;
    return Math.min((exp / maxExp) * 100, 100);
  };

  // Loading skeleton
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
        
        {/* Profile Card Skeleton */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 w-32 bg-slate-200 rounded"></div>
              <div className="h-4 w-48 bg-slate-200 rounded mt-1"></div>
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Ringkasan PT Skeleton */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 h-24">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-4 w-16 bg-slate-200 rounded mt-2"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Kehadiran Skeleton */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 h-20">
                <div className="h-4 w-8 bg-slate-200 rounded mx-auto"></div>
                <div className="h-4 w-12 bg-slate-200 rounded mx-auto mt-2"></div>
              </div>
            ))}
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
          onClick={handleRefresh}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Data</h3>
        <p className="text-slate-500 text-center max-w-md">
          Belum ada data yang tersedia di dashboard.
        </p>
      </div>
    );
  }

  const { profile, classSummary, todayAttendance } = data;
  const balance = profile.income - profile.expense;
  const expPercentage = getExpPercentage(profile.exp, profile.level);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Sekretaris
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau data diri dan ringkasan PT Anda
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-purple-600 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
        </button>
      </div>

      {/* Profile Card - Enhanced */}
      <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
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
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-mono font-bold rounded">
                {profile.role}
              </span>
              {profile.class_name && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded flex items-center gap-1">
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
              <p className="font-mono text-lg font-bold text-slate-900">{profile.level}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-slate-500">EXP</p>
              <p className="font-mono text-sm font-bold text-slate-900">
                {profile.exp} / {profile.level * 10}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-slate-500">Saldo</p>
              <p className={`font-mono text-sm font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(balance < 0 ? 0 : balance)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-emerald-600 font-bold">W: {profile.wins}</span>
              <span className="text-slate-300">/</span>
              <span className="text-rose-600 font-bold">L: {profile.losses}</span>
            </div>
          </div>
        </div>
        {/* Exp Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="font-mono">Progress EXP</span>
            <span className="font-mono">{Math.round(expPercentage)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500 rounded-full"
              style={{ width: `${expPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Karyawan
            </p>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {classSummary.reduce((sum, c) => sum + c.studentCount, 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-400">Total di PT</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Level Rata-rata
            </p>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {classSummary.length > 0 
              ? Math.round(classSummary.reduce((sum, c) => sum + (c.totalIncome - c.totalExpense > 0 ? 1 : 0), 0) / classSummary.length)
              : 0}
          </p>
          <p className="text-[10px] font-mono text-slate-400">Rata-rata</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Total Saldo PT
            </p>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-sm font-bold text-emerald-600 mt-1 truncate">
            {formatCurrency(classSummary.reduce((sum, c) => sum + (c.totalIncome - c.totalExpense < 0 ? 0 : c.totalIncome - c.totalExpense), 0))}
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
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ringkasan PT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
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
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-purple-600" />
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
                        <p className={`font-mono text-sm font-bold ${isPositive ? "text-emerald-600" : "text-slate-400"}`}>
                          {formatCurrency(isPositive ? balance : 0)}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          <span className="text-emerald-500">↑ {formatCurrency(cls.totalIncome)}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-500">↓ {formatCurrency(cls.totalExpense)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kehadiran Hari Ini */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Kehadiran Hari Ini
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-emerald-600">
                {todayAttendance.hadir}
              </p>
              <p className="text-[10px] font-mono text-emerald-600">Hadir</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <Clock className="w-5 h-5 text-amber-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-amber-600">
                {todayAttendance.izin}
              </p>
              <p className="text-[10px] font-mono text-amber-600">Izin</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <User className="w-5 h-5 text-blue-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-blue-600">
                {todayAttendance.sakit}
              </p>
              <p className="text-[10px] font-mono text-blue-600">Sakit</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <XCircle className="w-5 h-5 text-red-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-red-600">
                {todayAttendance.alpha}
              </p>
              <p className="text-[10px] font-mono text-red-600">Alpha</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <Award className="w-5 h-5 text-purple-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-purple-600">
                {todayAttendance.disPen}
              </p>
              <p className="text-[10px] font-mono text-purple-600">Dispen</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2">
            <span className="font-mono">Total Karyawan</span>
            <span className="font-mono font-bold text-slate-900">{todayAttendance.total}</span>
          </div>

          {todayAttendance.total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Kehadiran</span>
                <span>{Math.round((todayAttendance.hadir / todayAttendance.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${(todayAttendance.hadir / todayAttendance.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      {data.recentActivities && data.recentActivities.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
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
                      ? "bg-purple-50/80 border border-purple-100" 
                      : "bg-slate-50/80 border border-slate-100"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isFirst ? "bg-purple-200 text-purple-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {isFirst ? <TrendingUp className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">{activity.message}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                  {isFirst && (
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-700 text-[9px] font-mono font-bold rounded">
                      Baru
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-200 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-purple-700" />
          </div>
          <div>
            <p className="text-sm font-mono font-bold text-purple-900">
              Panel Sekretaris
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              Anda dapat mengelola data kelas dan karyawan. Untuk mengelola soal dan duel, 
              silakan hubungi Admin (Guru).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}