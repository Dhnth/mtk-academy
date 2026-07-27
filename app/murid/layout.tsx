"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  LogOut,
  UserCog,
  Swords,
  User,
  Award,
  History,
  ChevronDown,
  Shield,
  Trophy,
} from "lucide-react";
import Providers from "@/components/providers";

export default function MuridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <MuridLayoutContent>{children}</MuridLayoutContent>
    </Providers>
  );
}

function MuridLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    {
      label: "Beranda",
      href: "/murid",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Hall of Fame",
      href: "/murid/hall-of-fame",
      icon: Trophy,
      exact: false,
    },
    {
      label: "Battle",
      href: "/murid/battle",
      icon: Swords,
      exact: false,
    },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserInitials = (): string => {
    if (!session?.user?.name) return "M";
    const names = session.user.name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getUserRole = (): string => {
    const role = session?.user?.role;
    if (role === "ADMIN") return "Admin";
    if (role === "SECRETARY") return "Sekretaris";
    return "Murid";
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen pb-20 md:pb-24">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto h-16">
          <div className="flex items-center gap-3">
            <Link href="/murid" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm border border-emerald-700 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-mono text-base sm:text-lg font-bold tracking-tight text-emerald-700 uppercase leading-none">
                  MTK Academy
                </h1>
                <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                  Murid
                </span>
              </div>
            </Link>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-mono font-bold shadow-sm">
                {getUserInitials()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-900 leading-none">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[10px] font-mono text-slate-400 leading-none mt-0.5">
                  {getUserRole()}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    @{session?.user?.username || "username"}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-600 mt-0.5">
                    {getUserRole()}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/murid/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/murid/profile?tab=stats"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Award className="w-4 h-4" />
                    <span>Statistik</span>
                  </Link>
                  <Link
                    href="/murid/profile?tab=history"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <History className="w-4 h-4" />
                    <span>Riwayat</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                  active
                    ? "text-emerald-600 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    active ? "bg-emerald-50 text-emerald-600" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-[1.75]"}`}
                  />
                </div>
                <span className="text-[11px] font-mono tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}