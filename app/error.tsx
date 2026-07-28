"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  RefreshCw,
  Home,
  ArrowLeft,
  Shield,
} from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error ke console (atau ke service monitoring)
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-red-100/20 to-orange-100/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 border border-red-200 mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="font-mono text-3xl font-bold text-slate-800">
            Terjadi Kesalahan
          </h1>
          
          {/* Description */}
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Maaf, terjadi kesalahan saat memuat halaman ini.
            Silakan coba lagi atau kembali ke halaman sebelumnya.
          </p>

          {/* Error Detail (hanya di dev) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Detail Error
              </p>
              <p className="text-xs font-mono text-red-600 break-all">
                {error.message || "Unknown error"}
              </p>
              {error.digest && (
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => reset()}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-mono text-sm font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300/50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>

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