"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Swords,
  Clock,
  Loader2,
  X,
  AlertCircle,
  Users,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

export default function SoloMatchmakingPage() {
  const router = useRouter();
  const [isQueueing, setIsQueueing] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = pusherClient.subscribe("arena-global");
    channel.bind("match-found", (data: { player1Id: string; player2Id: string; matchId: string }) => {
      fetch("/api/battle/profile")
        .then((res) => res.json())
        .then((profile) => {
          if (data.player1Id === profile.id || data.player2Id === profile.id) {
            setIsQueueing(false);
            if (timerRef.current) clearInterval(timerRef.current);
            window.location.href = `/sekretaris/battle/duel/${data.matchId}`;
          }
        })
        .catch((err) => console.error("Error checking match:", err));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, [router]);

  const startQueue = async () => {
    setError(null);
    setIsQueueing(true);
    setWaitingTime(0);

    try {
      const res = await fetch("/api/battle/solo/queue", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal masuk antrian");
        setIsQueueing(false);
        return;
      }

      // Match found immediately (other player was already waiting)
      if (data.matchId) {
        window.location.href = `/sekretaris/battle/duel/${data.matchId}`;
        return;
      }

      // Start timer (no match yet, now in queue)
      timerRef.current = setInterval(() => {
        setWaitingTime((prev) => {
          if (prev >= 3600) {
            clearInterval(timerRef.current!);
            handleTimeout("Waktu pencarian habis (1 jam). Tidak ada lawan dengan level yang sama ditemukan. Coba lagi nanti!");
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Subscribe ke channel user untuk notifikasi
      const userChannel = pusherClient.subscribe(`user-${data.userId}`);
      userChannel.bind("match-cancel", () => {
        clearInterval(timerRef.current!);
        setIsQueueing(false);
        setError("Pencarian dibatalkan oleh sistem");
        userChannel.unbind_all();
        userChannel.unsubscribe();
      });
      userChannel.bind("match-found", (matchData: { matchId: string }) => {
        clearInterval(timerRef.current!);
        setIsQueueing(false);
        userChannel.unbind_all();
        userChannel.unsubscribe();
        window.location.href = `/sekretaris/battle/duel/${matchData.matchId}`;
      });

    } catch (err) {
      console.error("Error starting queue:", err);
      setError("Terjadi kesalahan saat masuk antrian");
      setIsQueueing(false);
    }
  };

  const cancelQueue = async () => {
    if (!isQueueing) return;

    try {
      await fetch("/api/battle/solo/queue/cancel", {
        method: "POST",
      });
    } catch (err) {
      console.error("Error cancelling queue:", err);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsQueueing(false);
    setWaitingTime(0);
    setShowCancelModal(false);
  };

  const handleTimeout = (message: string) => {
    setIsQueueing(false);
    setTimeoutMessage(message);
    setShowTimeoutModal(true);

    fetch("/api/battle/solo/queue/cancel", {
      method: "POST",
    }).catch((err) => console.error("Error cancelling queue:", err));
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Swords className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900">
          Solo Duel
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Cari lawan untuk duel 1v1!
        </p>
      </div>

      {/* Queue Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        {isQueueing ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-slate-900">
                Mencari Lawan...
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(waitingTime)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-mono font-bold"
            >
              Batalkan
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Cari lawan dengan level yang sama</p>
              <p className="text-xs text-slate-400 mt-1">
                Matchmaking berdasarkan level Anda
              </p>
            </div>
            <button
              onClick={startQueue}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
            >
              Cari Lawan
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Info Duel Solo:</p>
        <ul className="space-y-1 mt-1 ml-4 list-disc">
          <li>Duel 1v1 dengan sistem Best of 5 (3 kemenangan)</li>
          <li>Menang: +35 EXP, +10.000.000 (uang), +10 (nilai)</li>
          <li>Kalah: -15 EXP, -5.000.000 (uang), -5 (nilai)</li>
          <li>Matchmaking berdasarkan level (±1 level)</li>
          <li>Timeout 1 jam jika tidak ada lawan</li>
        </ul>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Batalkan Pencarian?
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Apakah Anda yakin ingin membatalkan pencarian lawan?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Lanjutkan
              </button>
              <button
                onClick={cancelQueue}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-mono text-sm font-bold"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeout Modal */}
      {showTimeoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-amber-600">
                Pencarian Berakhir
              </h3>
              <button
                onClick={() => setShowTimeoutModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="text-sm text-amber-700">{timeoutMessage}</p>
            </div>
            <button
               onClick={() => {
                setShowTimeoutModal(false);
                router.push("/sekretaris/battle");
              }}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
            >
              Kembali ke Battle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}