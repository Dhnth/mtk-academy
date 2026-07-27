"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy,
  Medal,
  Users,
  Wallet,
  Search,
  Crown,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  User,
  Flame,
  Zap,
  Star,
} from "lucide-react";

interface HallOfFameUser {
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

type SortType = "level" | "balance" | "wins" | "winrate";

export default function HallOfFamePage() {
  const [users, setUsers] = useState<HallOfFameUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<HallOfFameUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter states with debounce
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortType>("level");
  const [sortAsc, setSortAsc] = useState(false);
  
  // Debounced states
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedFilterClass, setDebouncedFilterClass] = useState<string>("all");
  
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  // Debounce effect for search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce effect for filter class (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterClass(filterClass);
    }, 300);

    return () => clearTimeout(timer);
  }, [filterClass]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hall-of-fame");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setUsers(data);
      setFilteredUsers(data);

      const classMap = new Map<string, string>();
      data.forEach((user: HallOfFameUser) => {
        if (user.class_id && user.class_name) {
          classMap.set(user.class_id, user.class_name);
        }
      });
      setClasses(Array.from(classMap.entries()).map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error("Error fetching hall of fame:", err);
      setError("Gagal memuat data. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort - menggunakan debounced values
  useEffect(() => {
    let result = [...users];

    // Filter by search (menggunakan debounced)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term)
      );
    }

    // Filter by class (menggunakan debounced)
    if (debouncedFilterClass !== "all") {
      result = result.filter((u) => u.class_id === debouncedFilterClass);
    }

    // Sort
    result.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortBy) {
        case "level":
          valA = a.level;
          valB = b.level;
          break;
        case "balance":
          valA = a.income - a.expense;
          valB = b.income - b.expense;
          break;
        case "wins":
          valA = a.wins;
          valB = b.wins;
          break;
        case "winrate":
          const totalA = a.wins + a.losses;
          const totalB = b.wins + b.losses;
          valA = totalA > 0 ? a.wins / totalA : 0;
          valB = totalB > 0 ? b.wins / totalB : 0;
          break;
        default:
          valA = 0;
          valB = 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    setFilteredUsers(result);
  }, [users, debouncedSearchTerm, debouncedFilterClass, sortBy, sortAsc]);

  // FUNGSI GABUNGAN FORMAT CURRENCY (REGULER & COMPACT)
  const formatCurrency = (amount: number, compact = false): string => {
    if (amount < 0) amount = 0;

    if (compact) {
      if (amount >= 1_000_000_000) {
        return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".0", "")} M`;
      }
      if (amount >= 1_000_000) {
        return `Rp ${(amount / 1_000_000).toFixed(1).replace(".0", "")} Jt`;
      }
      if (amount >= 1_000) {
        return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
      }
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getWinRate = (wins: number, losses: number): number => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  const getSortLabel = (sort: SortType): string => {
    switch (sort) {
      case "level":
        return "Level";
      case "balance":
        return "Saldo";
      case "wins":
        return "Menang";
      case "winrate":
        return "Win Rate";
      default:
        return "Level";
    }
  };

  const topThree = filteredUsers.slice(0, 3);
  const restUsers = filteredUsers.slice(3);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-200 rounded mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-32">
              <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
              <div className="h-8 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-[350px] bg-slate-100 rounded-2xl animate-pulse" />
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const topLevel = users.length > 0 ? Math.max(...users.map((u) => u.level)) : 0;
  const topBalance = users.length > 0
    ? Math.max(...users.map((u) => u.income - u.expense))
    : 0;
  const topWins = users.length > 0 ? Math.max(...users.map((u) => u.wins)) : 0;
  const totalUsers = users.length;

  const topLevelUser = users.find((u) => u.level === topLevel);
  const topBalanceUser = users.find((u) => u.income - u.expense === topBalance);
  const topWinsUser = users.find((u) => u.wins === topWins);

  return (
    <div className="space-y-6 md:space-y-8 p-1 sm:p-0">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="font-mono text-xl sm:text-3xl font-bold text-white">
                Hall of Fame
              </h1>
              <p className="text-amber-100 text-xs sm:text-sm">
                Para pejuang terbaik di arena MTK Academy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur font-mono">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {totalUsers} Pejuang
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">Level Tertinggi</p>
              <p className="font-mono text-lg sm:text-2xl font-bold text-slate-900">{topLevel}</p>
              {topLevelUser && (
                <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">{topLevelUser.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">Saldo Tertinggi</p>
              <p 
                className="font-mono text-base sm:text-xl font-bold text-slate-900 truncate" 
                title={formatCurrency(topBalance)}
              >
                {formatCurrency(topBalance, true)}
              </p>
              {topBalanceUser && (
                <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">{topBalanceUser.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">Menang Terbanyak</p>
              <p className="font-mono text-lg sm:text-2xl font-bold text-slate-900">{topWins}</p>
              {topWinsUser && (
                <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">{topWinsUser.name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">Total Pejuang</p>
              <p className="font-mono text-lg sm:text-2xl font-bold text-slate-900">{totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PODIUM 3 BESAR */}
      {topThree.length > 0 && (
        <div className="relative pt-12 pb-6 px-2 sm:px-6 bg-gradient-to-b from-slate-100 via-white to-slate-50 rounded-2xl border border-slate-200 overflow-visible">
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-200/40 to-transparent rounded-b-2xl pointer-events-none" />

          <div className="text-center mb-18">
            <h3 className="font-mono text-base sm:text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              Singgasana Para Legenda
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </h3>
          </div>

          <div className="grid grid-cols-3 items-end max-w-2xl mx-auto gap-1.5 sm:gap-4">

            {/* 2nd Place - Silver */}
            {topThree.length > 1 ? (
              <div className="flex flex-col items-center">
                <div className="w-full bg-gradient-to-b from-slate-100 to-slate-200/90 rounded-t-xl sm:rounded-t-2xl p-2 sm:p-4 text-center border-t-2 border-x-2 border-slate-300 shadow-md relative">
                  <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2">
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white shadow-md border-2 sm:border-4 border-white">
                      <Medal className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-500">#2</p>
                    <p className="font-bold text-slate-800 text-[11px] sm:text-base text-center break-words leading-tight px-1">{topThree[1].name}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono truncate max-w-[80px] sm:max-w-none mx-auto">@{topThree[1].username}</p>
                    
                    <div className="mt-1.5 sm:mt-2 flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-slate-300/60 text-slate-800 text-[8px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-0.5">
                          <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-600" />
                          {topThree[1].level}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-300/60 text-slate-800 text-[8px] sm:text-[10px] font-mono font-bold rounded-full">
                          {getWinRate(topThree[1].wins, topThree[1].losses)}% WR
                        </span>
                      </div>
                      
                      <span 
                        className="px-2 py-0.5 bg-emerald-600 text-white text-[8px] sm:text-[10px] font-mono font-bold rounded-full text-center leading-tight shadow-sm"
                        title={formatCurrency(topThree[1].income - topThree[1].expense)}
                      >
                        {formatCurrency(topThree[1].income - topThree[1].expense, true)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-16 sm:h-24 bg-gradient-to-b from-slate-300 to-slate-400 rounded-b-md sm:rounded-b-lg flex items-center justify-center shadow-inner">
                  <span className="text-white font-mono text-[10px] sm:text-xs font-bold tracking-widest">SILVER</span>
                </div>
              </div>
            ) : <div />}

            {/* 1st Place - Gold */}
            {topThree.length > 0 && (
              <div className="flex flex-col items-center z-10 -mt-4">
                <div className="w-full bg-gradient-to-b from-amber-100 via-amber-100/90 to-amber-200/90 rounded-t-xl sm:rounded-t-2xl p-2 sm:p-5 text-center border-t-4 border-x-2 border-amber-400 shadow-xl relative overflow-visible">
                  
                  <div className="absolute -top-8 sm:-top-9 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-xl border-2 sm:border-4 border-white ring-2 sm:ring-4 ring-amber-300/50">
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-100" />
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-7">
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-800">#1</span>
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-xs sm:text-lg text-center break-words leading-tight px-1">{topThree[0].name}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-600 font-mono truncate max-w-[85px] sm:max-w-none mx-auto">@{topThree[0].username}</p>
                    
                    <div className="mt-1.5 sm:mt-2 flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-0.5">
                          <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-current" />
                          {topThree[0].level}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 text-[8px] sm:text-[10px] font-mono font-bold rounded-full">
                          {getWinRate(topThree[0].wins, topThree[0].losses)}% WR
                        </span>
                      </div>

                      <span 
                        className="px-2 py-0.5 bg-emerald-600 text-white text-[8px] sm:text-[10px] font-mono font-bold rounded-full text-center leading-tight shadow-sm"
                        title={formatCurrency(topThree[0].income - topThree[0].expense)}
                      >
                        {formatCurrency(topThree[0].income - topThree[0].expense, true)}
                      </span>
                    </div>

                    <div className="mt-1 hidden sm:flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span className="text-[9px] text-amber-700 font-mono font-bold uppercase">Juara Utama</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-24 sm:h-36 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-b-md sm:rounded-b-lg flex items-center justify-center shadow-inner">
                  <span className="text-white font-mono text-[10px] sm:text-xs font-bold tracking-widest">GOLD</span>
                </div>
              </div>
            )}

            {/* 3rd Place - Bronze */}
            {topThree.length > 2 ? (
              <div className="flex flex-col items-center">
                <div className="w-full bg-gradient-to-b from-amber-50 to-amber-100/80 rounded-t-xl sm:rounded-t-2xl p-2 sm:p-4 text-center border-t-2 border-x-2 border-amber-300 shadow-md relative">
                  <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2">
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white shadow-md border-2 sm:border-4 border-white">
                      <Medal className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <p className="text-[10px] sm:text-xs font-mono font-bold text-amber-700">#3</p>
                    <p className="font-bold text-slate-800 text-[11px] sm:text-base text-center break-words leading-tight px-1">{topThree[2].name}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono truncate max-w-[80px] sm:max-w-none mx-auto">@{topThree[2].username}</p>
                    
                    <div className="mt-1.5 sm:mt-2 flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-amber-200/80 text-amber-900 text-[8px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-0.5">
                          <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-700" />
                          {topThree[2].level}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-200/80 text-amber-900 text-[8px] sm:text-[10px] font-mono font-bold rounded-full">
                          {getWinRate(topThree[2].wins, topThree[2].losses)}% WR
                        </span>
                      </div>

                      <span 
                        className="px-2 py-0.5 bg-emerald-600 text-white text-[8px] sm:text-[10px] font-mono font-bold rounded-full text-center leading-tight shadow-sm"
                        title={formatCurrency(topThree[2].income - topThree[2].expense)}
                      >
                        {formatCurrency(topThree[2].income - topThree[2].expense, true)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-12 sm:h-18 bg-gradient-to-b from-amber-600 to-amber-700 rounded-b-md sm:rounded-b-lg flex items-center justify-center shadow-inner">
                  <span className="text-white font-mono text-[10px] sm:text-xs font-bold tracking-widest">BRONZE</span>
                </div>
              </div>
            ) : <div />}

          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:flex gap-2">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm font-mono"
          >
            <option value="all">Semua Kelas/PT</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="w-full px-3 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm font-mono pr-8 appearance-none"
            >
              <option value="level">Sort: Level</option>
              <option value="balance">Sort: Saldo</option>
              <option value="wins">Sort: Menang</option>
              <option value="winrate">Sort: Win Rate</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Urutan"
            >
              {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 w-10">#</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Pejuang</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden sm:table-cell">PT / Kelas</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 text-center">Level</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 text-right hidden md:table-cell">Saldo</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 text-center hidden lg:table-cell">M / K</th>
                <th className="px-3 sm:px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 text-center">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {restUsers.length === 0 && topThree.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs sm:text-sm">Belum ada pejuang yang ditemukan</p>
                  </td>
                </tr>
              ) : (
                restUsers.map((user, index) => {
                  const balance = user.income - user.expense;
                  const winRate = getWinRate(user.wins, user.losses);
                  const rank = index + 4;

                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-mono font-bold text-slate-400">
                        {rank}.
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-xs sm:text-sm flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{user.name}</span>
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 truncate">@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        {user.class_name ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold rounded border border-emerald-200/50">
                            {user.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{user.level}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-right">
                        <span className={`font-mono text-xs sm:text-sm font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatCurrency(balance)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
                          <span className="text-emerald-600 font-bold">{user.wins}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 font-bold">{user.losses}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-8 sm:w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {winRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 text-[10px] sm:text-xs">
          <span className="text-slate-500 font-mono">
            Menampilkan {filteredUsers.length} dari {users.length} pejuang
          </span>
          <span className="text-slate-400 font-mono hidden sm:inline">
            Diurutkan berdasarkan: <span className="font-bold text-slate-600">{getSortLabel(sortBy)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}