"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, ArrowDownRight, Award, LogOut, UserCheck } from "lucide-react";
import { signOut } from "next-auth/react";

// Types dideklarasikan langsung di file ini
interface UserData {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "SECRETARY" | "STUDENT";
  income: number;
  expense: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data: UserData = await res.json();
          setUser(data);
        }
      } catch {
        console.error("Gagal mengambil data profil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--tertiary)] animate-pulse">
          MEMUAT DATA ARENA...
        </span>
      </div>
    );
  }

  const income = user?.income ?? 0;
  const expense = user?.expense ?? 0;
  const netCash = Math.max(0, income - expense);
  const academicGrade = (netCash / 1_000_000).toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 max-w-lg mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--tertiary)] block">
            {user?.role} PORTAL
          </span>
          <h1 className="font-mono text-xl font-bold text-[var(--secondary)]">
            {user?.name || user?.username}
          </h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 border border-[var(--border)] rounded-sm hover:bg-slate-100 transition-colors text-[var(--tertiary)] cursor-pointer"
          title="Keluar"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Finance Card */}
      <div className="bg-white border border-[var(--border)] rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-[var(--secondary)]">
            <Wallet className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-mono text-xs uppercase font-bold">
              Neraca Keuangan PT
            </span>
          </div>
          <div className="flex items-center space-x-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm">
            <Award className="w-3 h-3 text-[var(--primary)]" />
            <span className="font-mono text-xs font-bold text-[var(--primary)]">
              NILAI: {academicGrade}
            </span>
          </div>
        </div>

        {/* Kas Bersih */}
        <div className="p-4 bg-[var(--secondary)] text-white rounded-sm space-y-1">
          <span className="font-mono text-[10px] uppercase text-slate-400 block tracking-wider">
            Sisa Kas Bersih
          </span>
          <span className="font-mono text-2xl font-bold tracking-tight">
            Rp {netCash.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Breakdown Income & Expense */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 border border-[var(--border)] rounded-sm space-y-0.5">
            <div className="flex items-center space-x-1 text-emerald-600">
              <ArrowUpRight className="w-3 h-3" />
              <span className="font-mono text-[10px] uppercase font-bold">
                Pemasukan
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-slate-800 block">
              +Rp {income.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-[var(--border)] rounded-sm space-y-0.5">
            <div className="flex items-center space-x-1 text-[var(--destructive)]">
              <ArrowDownRight className="w-3 h-3" />
              <span className="font-mono text-[10px] uppercase font-bold">
                Pengeluaran
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-slate-800 block">
              -Rp {expense.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase font-bold text-[var(--tertiary)] block">
          Menu Utama
        </span>

        <div className="grid grid-cols-1 gap-2 font-mono text-xs">
          {["ADMIN", "SECRETARY"].includes(user?.role || "") && (
            <a
              href="/presensi"
              className="flex items-center justify-between p-3 bg-white border border-[var(--border)] rounded-sm hover:border-[var(--primary)] transition-colors text-[var(--secondary)] font-medium"
            >
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                <span>Input Presensi Karyawan</span>
              </div>
              <span>→</span>
            </a>
          )}

          <a
            href="/arena"
            className="flex items-center justify-between p-3 bg-[var(--primary)] text-white rounded-sm hover:bg-[var(--primary-container)] transition-colors font-medium"
          >
            <span>Masuk Matchmaking Arena 1v1</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}