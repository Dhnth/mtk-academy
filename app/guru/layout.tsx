"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Shield,
  LayoutDashboard,
  Building2,
  BookOpen,
  LogOut,
  CalendarCheck,
} from "lucide-react";

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Beranda",
      href: "/guru",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Manajemen PT",
      href: "/guru/manajemen-pt",
      icon: Building2,
      exact: false,
    },
    {
      label: "Kehadiran",
      href: "/guru/kehadiran",
      icon: CalendarCheck,
      exact: false,
    },
    {
      label: "Latihan Soal",
      href: "/guru/latihan-soal",
      icon: BookOpen,
      exact: false,
    },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  // Grid columns based on number of items
  const gridCols = navItems.length <= 3 ? 3 : 4;

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen pb-20 md:pb-24">
      {/* Header Utama Mobile & Desktop */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-[1280px] mx-auto h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm border border-blue-700 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-mono text-base sm:text-lg font-bold tracking-tight text-blue-700 uppercase leading-none">
                MATH WARFARE
              </h1>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                PANEL GURU
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-red-600 hover:bg-red-50 text-xs font-mono transition-colors cursor-pointer"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Keluar</span>
          </button>
        </div>
      </header>

      {/* Konten Utama Halaman */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Bottom Navigation Bar (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className={`max-w-md mx-auto grid grid-cols-${gridCols} h-16 px-2`}>
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                  active
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    active ? "bg-blue-50 text-blue-600" : ""
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