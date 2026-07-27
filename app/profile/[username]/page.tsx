import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Award,
  Wallet,
  TrendingUp,
  Calendar,
  Building2,
  Star,
  Sparkles,
  Crown,
  User,
  Sword,
  Zap,
} from "lucide-react";
import { query, getFirstRow } from "@/lib/db";

interface PublicProfile {
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

export const dynamic = "force-static";
export const revalidate = 3600;

async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const result = await query(
    `SELECT 
      u.id,
      u.username,
      u.name,
      u.role,
      c.name as class_name,
      u.level,
      u.exp,
      u.income,
      u.expense,
      u.wins,
      u.losses,
      u.created_at
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.username = $1 AND u.role IN ('STUDENT', 'SECRETARY')`,
    [username]
  );

  const user = getFirstRow(result) as PublicProfile | null;
  return user;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getPublicProfile(username);

  if (!user) {
    notFound();
  }

  const balance = user.income - user.expense;
  const winRate = user.wins + user.losses > 0
    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
    : 0;
  const expPercentage = Math.min((user.exp / (user.level * 100)) * 100, 100);

  // Theme based on role
  const isSecretary = user.role === "SECRETARY";
  
  const theme = isSecretary 
    ? { 
        primary: "purple",
        gradient: "from-purple-500 to-purple-600",
        bg: "bg-purple-50",
        text: "text-purple-600",
        textLight: "text-purple-400",
        border: "border-purple-200",
        ring: "ring-purple-300/50",
        badge: "bg-purple-100 text-purple-700",
        label: "Sekretaris",
      }
    : {
        primary: "emerald",
        gradient: "from-emerald-500 to-emerald-600",
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        textLight: "text-emerald-400",
        border: "border-emerald-200",
        ring: "ring-emerald-300/50",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Murid",
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
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const getLevelBadge = (level: number) => {
    if (level >= 50) return { label: "Legendary", color: "text-amber-400" };
    if (level >= 30) return { label: "Master", color: "text-purple-400" };
    if (level >= 15) return { label: "Expert", color: "text-blue-400" };
    if (level >= 8) return { label: "Warrior", color: "text-emerald-400" };
    return { label: "Rookie", color: "text-slate-400" };
  };

  const levelBadge = getLevelBadge(user.level);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Main Card */}
          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden backdrop-blur-sm">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${theme.gradient} px-4 sm:px-6 py-6 sm:py-8 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl sm:text-4xl font-mono font-bold border-2 sm:border-4 border-white/40 shadow-xl ring-4 ${theme.ring}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {winRate >= 70 && (
                    <div className="absolute -top-1 -right-1">
                      <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                    <h1 className="font-mono text-lg sm:text-2xl font-bold text-white truncate max-w-[180px] sm:max-w-none">
                      {user.name}
                    </h1>
                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 backdrop-blur rounded-full text-[10px] sm:text-xs font-mono font-bold text-white border border-white/20 shrink-0`}>
                      <User className="w-3 h-3 inline mr-1" />
                      {theme.label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                    <span className={`px-2 py-0.5 bg-white/30 text-white text-[9px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-1`}>
                      <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="truncate max-w-[80px] sm:max-w-none text-white">{user.class_name || "Belum ada PT"}</span>
                    </span>
                    <span className={`px-2 py-0.5 bg-white/30 text-white text-[9px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-1`}>
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{levelBadge.label}</span>
                    </span>
                  </div>
                  
                  <p className="text-white/80 text-xs sm:text-sm mt-1.5 font-mono truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Level & EXP Section */}
              <div className={`${theme.bg}/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border ${theme.border}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.text}`} />
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-700">Level {user.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${theme.textLight}`} />
                    <span className="font-mono text-[10px] sm:text-xs text-slate-500">{user.exp} / {user.level * 100} EXP</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full h-2 sm:h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${theme.gradient} rounded-full transition-all duration-1000`}
                      style={{ width: `${expPercentage}%` }}
                    />
                  </div>
                  <div className="absolute -top-5 right-0">
                    <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">{Math.round(expPercentage)}%</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid - Responsive 2x2 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className={`${theme.bg}/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border ${theme.border} hover:shadow-md transition-all`}>
                  <div className={`flex items-center justify-center gap-1 ${theme.text} mb-0.5 sm:mb-1`}>
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider">Win Rate</span>
                  </div>
                  <p className={`font-mono text-lg sm:text-2xl font-bold ${theme.text}`}>{winRate}%</p>
                </div>
                <div className={`${theme.bg}/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border ${theme.border} hover:shadow-md transition-all`}>
                  <div className={`flex items-center justify-center gap-1 ${theme.text} mb-0.5 sm:mb-1`}>
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider">Saldo</span>
                  </div>
                  <p className={`font-mono text-xs sm:text-lg font-bold ${theme.text} truncate`}>
                    {formatCurrency(balance < 0 ? 0 : balance)}
                  </p>
                </div>
                <div className="bg-slate-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-slate-200/60 hover:shadow-md transition-all">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5 sm:mb-1">
                    <Sword className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider">Menang</span>
                  </div>
                  <p className="font-mono text-lg sm:text-2xl font-bold text-emerald-600">{user.wins}</p>
                </div>
                <div className="bg-slate-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-slate-200/60 hover:shadow-md transition-all">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5 sm:mb-1">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider">Kalah</span>
                  </div>
                  <p className="font-mono text-lg sm:text-2xl font-bold text-rose-600">{user.losses}</p>
                </div>
              </div>

              {/* Info Cards - Responsive stack on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-slate-50/80 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200/60 flex items-center gap-2 sm:gap-3">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase tracking-wider">Bergabung</p>
                    <p className="font-mono text-[10px] sm:text-xs font-bold text-slate-700 truncate">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                <div className="bg-slate-50/80 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200/60 flex items-center gap-2 sm:gap-3">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase tracking-wider">Total Battle</p>
                    <p className="font-mono text-[10px] sm:text-xs font-bold text-slate-700">{user.wins + user.losses}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/60"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-3 py-0.5 ${theme.bg} ${theme.text} text-[9px] sm:text-[10px] font-mono font-bold rounded-full border ${theme.border}`}>
                    MTK Academy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}