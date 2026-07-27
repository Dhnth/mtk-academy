"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Shield, ArrowRight, Users, Swords, Trophy, Sparkles, ChevronRight, LogIn } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-mono text-xl font-bold text-blue-700 uppercase tracking-tight">
                MTK Academy
              </span>
            </div>
            <div className="flex items-center gap-4">
              {session ? (
                <Link
                  href={
                    session.user?.role === "ADMIN"
                      ? "/guru"
                      : session.user?.role === "SECRETARY"
                      ? "/sekretaris"
                      : "/murid"
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
                >
                  Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-yellow-300 font-mono text-sm font-bold tracking-wider">
                ARENA PERTEMPURAN MATEMATIKA
              </span>
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <h1 className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              Belajar Matematika
              <br />
              <span className="text-yellow-300">dengan Cara Bertarung</span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto">
              Duel 1v1, battle tim, dan rebutkan posisi di Hall of Fame. 
              Asah kemampuan matematika sambil bersaing dengan teman-temanmu!
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {!session && (
                <Link
                  href="/login"
                  className="px-8 py-3 bg-white text-blue-700 rounded-xl font-mono font-bold hover:shadow-lg transition-all hover:scale-105"
                >
                  Mulai Bertarung →
                </Link>
              )}
              <Link
                href="#features"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-mono font-bold hover:bg-white/10 transition-all"
              >
                Pelajari Lebih Lanjut
              </Link>
            </div>
            {!session && (
              <p className="mt-4 text-sm text-blue-200 font-mono">
                Sudah punya akun? <Link href="/login" className="text-white font-bold hover:underline">Masuk di sini</Link>
              </p>
            )}
            {session && (
              <p className="mt-4 text-sm text-blue-200 font-mono">
                Selamat datang kembali!{" "}
                <Link
                  href={
                    session.user?.role === "ADMIN"
                      ? "/guru"
                      : session.user?.role === "SECRETARY"
                      ? "/sekretaris"
                      : "/murid"
                  }
                  className="text-white font-bold hover:underline"
                >
                  Buka Dashboard →
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-mono text-3xl font-bold text-slate-900">
              Fitur Unggulan
            </h2>
            <p className="text-slate-500 mt-2">Segala yang Anda butuhkan untuk belajar matematika dengan cara yang seru</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Swords className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-mono font-bold text-slate-900">Solo Duel</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tantang pemain lain dalam duel 1v1 cepat-cepatan jawab soal matematika.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-mono font-bold text-slate-900">Team Battle</h3>
              <p className="text-sm text-slate-500 mt-2">
                Bentuk tim 4 orang dan bertarung melawan tim lain dalam battle seru!
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="font-mono font-bold text-slate-900">Hall of Fame</h3>
              <p className="text-sm text-slate-500 mt-2">
                Rebutkan posisi teratas dan jadilah legenda di arena MTK Academy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-mono text-3xl font-bold text-blue-600">500+</p>
              <p className="text-sm text-slate-500">Soal Matematika</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-blue-600">1000+</p>
              <p className="text-sm text-slate-500">Pertempuran</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-blue-600">50+</p>
              <p className="text-sm text-slate-500">Pejuang Aktif</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500 font-mono">
            © 2026 MTK Academy — Arena Pertempuran Matematika
          </p>
        </div>
      </footer>
    </div>
  );
}