"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Home,
  ArrowLeft,
  Search,
  Shield,
  Users,
  User,
  Building2,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-blue-100/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 border border-red-200 mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>

          {/* Status Code */}
          <h1 className="font-mono text-7xl font-black text-slate-800 tracking-tight">404</h1>
          
          {/* Title */}
          <h2 className="font-mono text-xl font-bold text-slate-700 mt-3">
            Halaman Tidak Ditemukan
          </h2>
          
          {/* Description */}
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
            Periksa kembali URL atau gunakan navigasi di bawah ini.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>

            <Link
              href="/"
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-mono text-sm font-bold transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300/50 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ke Beranda
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-6 pt-6 border-t border-slate-200/60">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3">
              Navigasi Cepat
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/murid"
                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-mono font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <User className="w-3 h-3" />
                Murid
              </Link>
              <Link
                href="/sekretaris"
                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-mono font-medium hover:bg-purple-100 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3 h-3" />
                Sekretaris
              </Link>
              <Link
                href="/guru"
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-mono font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3 h-3" />
                Guru
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200/60">
            <span className="font-mono text-[10px] text-slate-400 tracking-wider">
              © 2026 MTK Academy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}