"use client";

import { useState, useEffect, useCallback } from "react";
import Pusher from "pusher-js";
import {
  Users,
  Target,
  Terminal,
  BarChart3,
  Building2,
  Zap,
  Database,
  PenTool,
  TrendingUp,
  Award,
  Info,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// Type definitions
interface StudentData {
  id: string;
  name: string;
  username: string;
  class_id: string | null;
  income: number;
  expense: number;
}

interface Company {
  id: string;
  name: string;
  category: string;
  balance: number;
  studentCount: number;
  status: string;
  iconType: string;
}

interface ActiveSession {
  id: string;
  className: string;
  module: string;
  progressPercent: number;
  activeStudentCount: number;
}

interface DashboardData {
  stats: {
    totalStudents: number;
    activeUnitsCount: number;
    totalIncome: number;
    totalExpense: number;
  };
  companies: Company[];
  activeSessions: ActiveSession[];
  topStudents: StudentData[];
}

export default function GuruPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guru");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      console.error("Gagal mengambil data dashboard guru:", err);
      setError("Gagal memuat data dashboard. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();

    // Pusher real-time subscription
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (pusherKey && pusherCluster) {
      const pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
      });

      const channel = pusher.subscribe("arena-global");
      channel.bind("data-updated", () => {
        void fetchDashboardData();
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
      };
    }
  }, [fetchDashboardData]);

  const renderCompanyIcon = (iconType: string) => {
    switch (iconType) {
      case "zap":
        return <Zap className="w-4 h-4 text-blue-600" />;
      case "database":
        return <Database className="w-4 h-4 text-blue-600" />;
      default:
        return <PenTool className="w-4 h-4 text-blue-600" />;
    }
  };

  // Format currency to IDR
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-16 bg-slate-200 rounded"></div>
                <div className="h-4 w-4 bg-slate-200 rounded"></div>
              </div>
              <div className="h-8 w-20 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Bento Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 h-32">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <div className="h-6 w-16 bg-slate-200 rounded mt-3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-xl mb-2"></div>
              ))}
            </div>
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Gagal Memuat Data
        </h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => void fetchDashboardData()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Database className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Belum Ada Data
        </h3>
        <p className="text-slate-500 text-center max-w-md">
          Mulai tambahkan kelas dan siswa untuk melihat dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Utama
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau statistik siswa dan unit latihan secara real-time.
          </p>
        </div>
        <button
          onClick={() => void fetchDashboardData()}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 shadow-2xs transition-all cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
          />
        </button>
      </div>

      {/* Stat Cards - Grid Adaptif Mobile First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Total Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              Karyawan
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 block">
              {data.stats.totalStudents}
            </span>
            <span className="text-blue-700 text-[11px] font-mono flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Terdaftar
            </span>
          </div>
        </div>

        {/* Stat 2: Active Units */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              Unit Aktif
            </span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 block">
              {data.stats.activeUnitsCount}
            </span>
            <span className="text-slate-500 text-[11px] font-mono mt-1 block">
              Unit Berjalan
            </span>
          </div>
        </div>

        {/* Stat 3: Total Income */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              Total Saldo
            </span>
            <Terminal className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="font-mono text-base sm:text-xl font-bold text-emerald-600 block truncate">
              {formatCurrency(data.stats.totalIncome)}
            </span>
            <span className="text-slate-500 text-[11px] font-mono mt-1 block">
              Kas Gabungan
            </span>
          </div>
        </div>

        {/* Stat 4: Total Expense */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              Pengeluaran
            </span>
            <BarChart3 className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <span className="font-mono text-base sm:text-xl font-bold text-rose-600 block truncate">
              {formatCurrency(data.stats.totalExpense)}
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    data.stats.totalIncome > 0
                      ? Math.min(
                          (data.stats.totalExpense / data.stats.totalIncome) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: PT Units & Live Monitoring */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section Unit Pelatihan */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-mono text-base font-bold text-slate-900">
                  Status Unit Pelatihan (PT)
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {data.companies.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm">Belum ada unit pelatihan</p>
                  <p className="text-xs">Tambahkan kelas untuk mulai</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.companies.map((unit) => (
                    <div
                      key={unit.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-mono font-bold rounded uppercase">
                            {unit.name}
                          </span>
                          {renderCompanyIcon(unit.iconType)}
                        </div>
                        <h4 className="font-mono text-xs font-bold text-slate-800 mb-1">
                          {unit.category}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Saldo: {formatCurrency(unit.balance)}
                        </span>
                      </div>

                      <div className="flex items-end justify-between mt-4 pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="font-mono text-base font-bold text-blue-600 block leading-none">
                            {unit.studentCount}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            Siswa
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded flex items-center gap-1 ${
                            unit.status === "AKTIF"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {unit.status === "AKTIF" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          {unit.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Kolom Kanan: Leaderboard & Agenda Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Students */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-base font-bold text-slate-900">
                Top Performers
              </h3>
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-2">
              {data.topStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Belum ada siswa</p>
                </div>
              ) : (
                data.topStudents.map((st, idx) => {
                  const netIncome = st.income - st.expense;
                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold text-sm min-w-[28px] ${
                            idx === 0
                              ? "text-amber-600"
                              : idx === 1
                              ? "text-slate-400"
                              : idx === 2
                              ? "text-amber-700"
                              : "text-slate-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            {st.name}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500">
                            Kas Net: {formatCurrency(netIncome)}
                          </p>
                        </div>
                      </div>
                      <TrendingUp
                        className={`w-4 h-4 ${
                          netIncome >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Agenda & Pengumuman */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="font-mono text-base font-bold text-slate-900 mb-2">
              Agenda Akademik
            </h3>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-blue-900">Pembaruan Modul</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Modul Kalkulus II akan dirilis malam ini.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Evaluasi Pekanan</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Jumat, 24 April 2026 — Rekapitulasi token bulanan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}