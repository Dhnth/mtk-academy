"use client";

import { useState, FormEvent, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  AlertCircle,
  Shield,
  User,
  Lock,
  Sparkles,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface UserProfileResponse {
  role: "ADMIN" | "SECRETARY" | "STUDENT";
  error?: string;
}

export default function LoginPage() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auto redirect jika sudah login - PAKAI WINDOW.LOCATION
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "ADMIN") {
        window.location.href = "/guru";
      } else if (role === "SECRETARY") {
        window.location.href = "/sekretaris";
      } else if (role === "STUDENT") {
        window.location.href = "/murid";
      } else {
        window.location.href = "/murid";
      }
    }
  }, [session, status]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg("Nama pengguna atau kata sandi salah!");
        setLoading(false);
        return;
      }

      // 🔥 PAKAI WINDOW.LOCATION LANGSUNG, BUKAN ROUTER.PUSH
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const userData: UserProfileResponse = await meRes.json();
        if (userData.role === "ADMIN") {
          window.location.href = "/guru";
        } else if (userData.role === "SECRETARY") {
          window.location.href = "/sekretaris";
        } else {
          window.location.href = "/murid";
        }
      } else {
        // Fallback: redirect ke halaman default
        window.location.href = "/murid";
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan/server. Silakan coba lagi.");
      setLoading(false);
    }
  };

  // Jika sedang loading session, tampilkan loading
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-sm text-slate-500 font-mono">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // Jika sudah login, jangan tampilkan form (akan redirect otomatis)
  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-sm text-slate-500 font-mono">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-blue-100/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-200 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-mono text-3xl font-bold text-slate-900 tracking-tight">
            MTK Academy
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono tracking-wide">
            ARENA PERTEMPURAN MATEMATIKA
          </p>
        </div>

        {/* Card Login */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/30">
          {/* Notifikasi Error */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm font-sans p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                Nama Pengguna
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full h-11 pl-10 pr-3 bg-white border border-slate-200 rounded-xl font-sans text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-12 bg-white border border-slate-200 rounded-xl font-sans text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <span className="text-xs font-mono font-bold">Hide</span>
                  ) : (
                    <span className="text-xs font-mono font-bold">Show</span>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-mono text-sm font-bold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300/50 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES...</span>
                </>
              ) : (
                <>
                  <span>MASUK KE ARENA</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400 tracking-wider">
              © 2026 Math Battle Arena — v1.0.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}