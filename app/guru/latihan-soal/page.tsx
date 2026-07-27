"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import XLSX from "xlsx-js-style";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  BookOpen,
  BarChart3,
  TrendingUp,
  Layers,
  Info,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  level: number;
  usage_count: number;
  created_at: string;
}

interface LevelStats {
  level: number;
  totalQuestions: number;
  requiredQuestions: number;
  isSufficient: boolean;
}

export default function LatihanSoalPage() {
  // States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Alert states
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");

  // Form states
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptionA, setFormOptionA] = useState("");
  const [formOptionB, setFormOptionB] = useState("");
  const [formOptionC, setFormOptionC] = useState("");
  const [formOptionD, setFormOptionD] = useState("");
  const [formCorrect, setFormCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [formLevel, setFormLevel] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    message: string;
    success: number;
    failed: { row: number; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Level stats
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);

  // Show alert modal
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        filterLevel === "all"
          ? "/api/guru/questions"
          : `/api/guru/questions?level=${filterLevel}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setQuestions(data);

      // Hitung statistik per level
      const stats: Record<number, { total: number; required: number }> = {};
      data.forEach((q: Question) => {
        if (!stats[q.level]) {
          stats[q.level] = { total: 0, required: q.level + 4 };
        }
        stats[q.level].total += 1;
      });

      const levelStatsArray: LevelStats[] = Object.entries(stats).map(
        ([level, stat]) => ({
          level: Number(level),
          totalQuestions: stat.total,
          requiredQuestions: stat.required,
          isSufficient: stat.total >= stat.required,
        }),
      );

      setLevelStats(levelStatsArray);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Gagal memuat data soal. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, [filterLevel]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Filter questions by search
  const filteredQuestions = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // CRUD Operations
  const handleCreate = async () => {
    if (
      !formQuestion ||
      !formOptionA ||
      !formOptionB ||
      !formOptionC ||
      !formOptionD
    ) {
      showAlert("Validasi Gagal", "Semua field wajib diisi", "error");
      return;
    }

    try {
      const res = await fetch("/api/guru/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: formQuestion,
          option_a: formOptionA,
          option_b: formOptionB,
          option_c: formOptionC,
          option_d: formOptionD,
          correct: formCorrect,
          level: formLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal menambahkan soal", "error");
        return;
      }

      await fetchQuestions();
      setShowCreateModal(false);
      resetForm();
      showAlert("Berhasil", "Soal berhasil ditambahkan", "success");
    } catch (err) {
      console.error("Error creating question:", err);
      showAlert("Error", "Terjadi kesalahan saat menambahkan soal", "error");
    }
  };

  const handleEdit = async () => {
    if (
      !formQuestion ||
      !formOptionA ||
      !formOptionB ||
      !formOptionC ||
      !formOptionD
    ) {
      showAlert("Validasi Gagal", "Semua field wajib diisi", "error");
      return;
    }

    try {
      const res = await fetch("/api/guru/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          question: formQuestion,
          option_a: formOptionA,
          option_b: formOptionB,
          option_c: formOptionC,
          option_d: formOptionD,
          correct: formCorrect,
          level: formLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal memperbarui soal", "error");
        return;
      }

      await fetchQuestions();
      setShowEditModal(false);
      resetForm();
      setEditId(null);
      showAlert("Berhasil", "Soal berhasil diperbarui", "success");
    } catch (err) {
      console.error("Error updating question:", err);
      showAlert("Error", "Terjadi kesalahan saat memperbarui soal", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/guru/questions?id=${deleteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal menghapus soal", "error");
        return;
      }

      await fetchQuestions();
      setShowDeleteModal(false);
      setDeleteId(null);
      showAlert("Berhasil", "Soal berhasil dihapus", "success");
    } catch (err) {
      console.error("Error deleting question:", err);
      showAlert("Error", "Terjadi kesalahan saat menghapus soal", "error");
    }
  };

  // Import functions
  const handleImport = async () => {
    if (!importFile) {
      showAlert("Validasi Gagal", "Pilih file Excel terlebih dahulu", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    setImportLoading(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/guru/questions/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(
          "Gagal Import",
          data.error || "Gagal mengimport data",
          "error",
        );
        return;
      }

      setImportResult(data.results);
      await fetchQuestions();

      if (data.results.failed.length === 0) {
        showAlert(
          "Berhasil",
          `${data.results.success} soal berhasil diimport`,
          "success",
        );
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }, 1500);
      } else {
        showAlert(
          "Import Selesai",
          `${data.results.success} berhasil, ${data.results.failed.length} gagal`,
          "warning",
        );
      }
    } catch (err) {
      console.error("Error importing:", err);
      showAlert("Error", "Terjadi kesalahan saat mengimport data", "error");
    } finally {
      setImportLoading(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const headers = [
      "Pertanyaan",
      "Opsi A",
      "Opsi B",
      "Opsi C",
      "Opsi D",
      "Jawaban Benar",
      "Level",
    ];
    const sampleData = [
      ["2/3 + 5/6 = ?", "1", "1.5", "2", "2.5", "B", "1"],
      ["√81 = ?", "3", "6", "9", "12", "C", "1"],
      ["0,5 × 4,75 = ?", "2.125", "2.375", "2.5", "2.625", "B", "2"],
    ];

    const wsData = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header
    const headerStyle = {
      fill: { fgColor: { rgb: "2563EB" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
    };

    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) {
        ws[addr].s = headerStyle;
      }
    }

    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    // Add note
    const noteRow = [
      "Catatan:",
      "",
      "",
      "",
      "",
      "Jawaban Benar: A, B, C, atau D",
      "Level: angka minimal 1",
    ];
    const noteStartRow = wsData.length;
    noteRow.forEach((text, idx) => {
      const addr = XLSX.utils.encode_cell({ r: noteStartRow + idx, c: 0 });
      ws[addr] = { v: text };
      ws[addr].s = {
        font: { italic: true, color: { rgb: "6B7280" }, sz: 10 },
        alignment: { horizontal: "left" },
      };
    });

    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: noteStartRow + noteRow.length - 1, c: headers.length - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Soal.xlsx");
  };

  const resetForm = () => {
    setFormQuestion("");
    setFormOptionA("");
    setFormOptionB("");
    setFormOptionC("");
    setFormOptionD("");
    setFormCorrect("A");
    setFormLevel(1);
  };

  const openEditModal = (q: Question) => {
    setEditId(q.id);
    setFormQuestion(q.question);
    setFormOptionA(q.option_a);
    setFormOptionB(q.option_b);
    setFormOptionC(q.option_c);
    setFormOptionD(q.option_d);
    setFormCorrect(q.correct as "A" | "B" | "C" | "D");
    setFormLevel(q.level);
    setShowEditModal(true);
  };

  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // Get correct answer badge
  const getCorrectBadge = (correct: string) => {
    const colors = {
      A: "bg-emerald-100 text-emerald-700",
      B: "bg-blue-100 text-blue-700",
      C: "bg-amber-100 text-amber-700",
      D: "bg-purple-100 text-purple-700",
    };
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${colors[correct as keyof typeof colors]}`}
      >
        {correct}
      </span>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-200 rounded mt-2"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-4 h-24"
            >
              <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 w-48 bg-slate-200 rounded-xl"></div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Gagal Memuat Data
        </h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => fetchQuestions()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Manajemen Soal
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Kelola bank soal untuk duel dan battle matematika.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-mono text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Tambah Soal
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-mono text-sm font-bold"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      {/* Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Total Soal
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {questions.length}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Level Aktif
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {levelStats.length}
              </p>
            </div>
            <Layers className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        {/* Total Penggunaan */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Total Penggunaan
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {questions
                  .reduce((sum, q) => sum + Number(q.usage_count || 0), 0)
                  .toLocaleString("id-ID")}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-1">
            Total soal digunakan di battle
          </p>
        </div>
      </div>

      {/* Level Stats Detail */}
      {levelStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-sm font-bold text-slate-900">
              Status Ketersediaan Soal per Level
            </h3>
            <button
              onClick={() => setShowLevelInfoModal(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-mono font-bold"
            >
              <Info className="w-3 h-3" />
              Info
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {levelStats.map((stat) => (
              <div
                key={stat.level}
                className={`p-3 rounded-xl border ${
                  stat.isSufficient
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    Lv.{stat.level}
                  </span>
                  {stat.isSufficient ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {stat.totalQuestions} / {stat.requiredQuestions}
                </p>
                <p className="text-[9px] font-mono text-slate-400">
                  {stat.isSufficient ? "Cukup" : "Kurang"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari soal berdasarkan teks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono min-w-[120px]"
        >
          <option value="all">Semua Level</option>
          {levelStats.map((stat) => (
            <option key={stat.level} value={stat.level}>
              Level {stat.level}
            </option>
          ))}
        </select>
        <button
          onClick={() => fetchQuestions()}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Questions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  #
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Soal
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden md:table-cell">
                  Opsi
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Jawaban
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Level
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                  Digunakan
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {searchTerm
                      ? `Tidak ada soal dengan teks "${searchTerm}"`
                      : "Belum ada soal. Tambahkan soal pertama Anda."}
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q, idx) => (
                  <tr
                    key={q.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 text-sm line-clamp-2 max-w-[300px] font-math">
                        {q.question}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 md:hidden">
                        A: {q.option_a}, B: {q.option_b}, C: {q.option_c}, D:{" "}
                        {q.option_d}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5 text-xs">
                        <p className="text-slate-600">A. {q.option_a}</p>
                        <p className="text-slate-600">B. {q.option_b}</p>
                        <p className="text-slate-600">C. {q.option_c}</p>
                        <p className="text-slate-600">D. {q.option_d}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getCorrectBadge(q.correct)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded">
                        Lv.{q.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {q.usage_count}
                        </span>
                        <span className="text-[10px] text-slate-400">kali</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(q)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Soal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(q.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              {filteredQuestions.length} soal
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-mono"
              >
                Sebelumnya
              </button>
              <span className="text-xs text-slate-600 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-mono"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Tambah Soal Baru
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Pertanyaan
                </label>
                <textarea
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Contoh: 2/3 + 5/6 = ?"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none font-math"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mendukung pecahan (2/3), akar (√), desimal (0,5), dan operasi
                  matematika lainnya
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi A
                  </label>
                  <input
                    type="text"
                    value={formOptionA}
                    onChange={(e) => setFormOptionA(e.target.value)}
                    placeholder="Opsi A"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi B
                  </label>
                  <input
                    type="text"
                    value={formOptionB}
                    onChange={(e) => setFormOptionB(e.target.value)}
                    placeholder="Opsi B"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi C
                  </label>
                  <input
                    type="text"
                    value={formOptionC}
                    onChange={(e) => setFormOptionC(e.target.value)}
                    placeholder="Opsi C"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi D
                  </label>
                  <input
                    type="text"
                    value={formOptionD}
                    onChange={(e) => setFormOptionD(e.target.value)}
                    placeholder="Opsi D"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Jawaban Benar
                  </label>
                  <select
                    value={formCorrect}
                    onChange={(e) =>
                      setFormCorrect(e.target.value as "A" | "B" | "C" | "D")
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Level
                  </label>
                  <input
                    type="number"
                    value={formLevel}
                    onChange={(e) => setFormLevel(Number(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Level {formLevel} membutuhkan {formLevel + 4} soal
                  </p>
                </div>
              </div>

              {/* Warning if insufficient */}
              {levelStats.find((s) => s.level === formLevel)?.isSufficient ===
                false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Level {formLevel} saat ini memiliki{" "}
                    {levelStats.find((s) => s.level === formLevel)
                      ?.totalQuestions || 0}{" "}
                    soal. Minimal dibutuhkan {formLevel + 4} soal agar sistem
                    berjalan optimal.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Edit Soal
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Pertanyaan
                </label>
                <textarea
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Contoh: 2/3 + 5/6 = ?"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none font-math"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mendukung pecahan (2/3), akar (√), desimal (0,5), dan operasi
                  matematika lainnya
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi A
                  </label>
                  <input
                    type="text"
                    value={formOptionA}
                    onChange={(e) => setFormOptionA(e.target.value)}
                    placeholder="Opsi A"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi B
                  </label>
                  <input
                    type="text"
                    value={formOptionB}
                    onChange={(e) => setFormOptionB(e.target.value)}
                    placeholder="Opsi B"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi C
                  </label>
                  <input
                    type="text"
                    value={formOptionC}
                    onChange={(e) => setFormOptionC(e.target.value)}
                    placeholder="Opsi C"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Opsi D
                  </label>
                  <input
                    type="text"
                    value={formOptionD}
                    onChange={(e) => setFormOptionD(e.target.value)}
                    placeholder="Opsi D"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-math"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Jawaban Benar
                  </label>
                  <select
                    value={formCorrect}
                    onChange={(e) =>
                      setFormCorrect(e.target.value as "A" | "B" | "C" | "D")
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Level
                  </label>
                  <input
                    type="number"
                    value={formLevel}
                    onChange={(e) => setFormLevel(Number(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Level {formLevel} membutuhkan {formLevel + 4} soal
                  </p>
                </div>
              </div>

              {levelStats.find((s) => s.level === formLevel)?.isSufficient ===
                false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Level {formLevel} saat ini memiliki{" "}
                    {levelStats.find((s) => s.level === formLevel)
                      ?.totalQuestions || 0}{" "}
                    soal. Minimal dibutuhkan {formLevel + 4} soal agar sistem
                    berjalan optimal.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-red-600">
                Hapus Soal
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">
                Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak
                dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-mono text-sm font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL INFO MODAL */}
      {showLevelInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Informasi Kebutuhan Soal per Level
              </h3>
              <button
                onClick={() => setShowLevelInfoModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-mono text-sm font-bold text-blue-900 mb-2">
                  Aturan Kebutuhan Soal
                </h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">1.</span>
                    <span>Level 1 membutuhkan minimal 5 soal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">2.</span>
                    <span>Setiap naik 1 level, kebutuhan soal bertambah 1</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">3.</span>
                    <span>
                      Rumus:{" "}
                      <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">
                        Kebutuhan = Level + 4
                      </code>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-mono text-sm font-bold text-amber-900 mb-2">
                  Apa yang Terjadi Jika Soal Kurang?
                </h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>Soal yang sama akan diulang dalam duel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>
                      Murid level tinggi akan mendapatkan soal yang sama
                      berulang kali
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>Pengalaman bermain menjadi kurang variatif</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h4 className="font-mono text-sm font-bold text-emerald-900 mb-2">
                  Rekomendasi
                </h4>
                <ul className="space-y-2 text-sm text-emerald-700">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>Tambahkan minimal 2-3 soal cadangan per level</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>Variasi soal membuat duel lebih menarik</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold">•</span>
                    <span>
                      Soal yang sama boleh digunakan untuk level berbeda
                    </span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-slate-500">
                        Level
                      </th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-slate-500">
                        Kebutuhan
                      </th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelStats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-center text-slate-500 text-xs"
                        >
                          Belum ada data level
                        </td>
                      </tr>
                    ) : (
                      levelStats.map((stat) => (
                        <tr
                          key={stat.level}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 font-mono text-xs font-bold text-slate-900">
                            Lv.{stat.level}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {stat.totalQuestions} / {stat.requiredQuestions}
                          </td>
                          <td className="px-3 py-2">
                            {stat.isSufficient ? (
                              <span className="text-[10px] text-emerald-600 font-mono font-bold">
                                Cukup
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-mono font-bold">
                                Kurang
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => setShowLevelInfoModal(false)}
              className="w-full px-4 py-2.5 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Import Soal dari Excel
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Format File Excel:
                </p>
                <div className="mt-2 text-xs text-blue-600 font-mono space-y-0.5">
                  <div className="grid grid-cols-7 gap-1 bg-blue-100 p-1.5 rounded font-bold text-[9px]">
                    <span>Pertanyaan</span>
                    <span>Opsi A</span>
                    <span>Opsi B</span>
                    <span>Opsi C</span>
                    <span>Opsi D</span>
                    <span>Jawaban</span>
                    <span>Level</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded border border-blue-100 text-[9px]">
                    <span>2/3 + 5/6 = ?</span>
                    <span>1</span>
                    <span>1.5</span>
                    <span>2</span>
                    <span>2.5</span>
                    <span>B</span>
                    <span>1</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded border border-blue-100 text-[9px]">
                    <span>√81 = ?</span>
                    <span>3</span>
                    <span>6</span>
                    <span>9</span>
                    <span>12</span>
                    <span>C</span>
                    <span>1</span>
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  Jawaban: A, B, C, atau D • Level: angka minimal 1
                </p>
                <p className="text-xs text-blue-500">
                  Mendukung pecahan (2/3), akar (√), desimal (0,5)
                </p>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template Excel
              </button>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                  className="hidden"
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900 text-sm truncate max-w-[200px]">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                        setImportResult(null);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      Klik atau drag & drop file Excel
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Format .xlsx atau .xls
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-mono font-bold"
                    >
                      Pilih File
                    </button>
                  </div>
                )}
              </div>

              {importResult && (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm text-emerald-700 font-medium">
                      {importResult.success} soal berhasil diimport
                    </p>
                  </div>
                  {importResult.failed.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-h-[150px] overflow-y-auto">
                      <p className="text-sm text-red-700 font-medium">
                        {importResult.failed.length} soal gagal diimport
                      </p>
                      <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                        {importResult.failed.map((f, idx) => (
                          <li key={idx}>
                            Baris {f.row}: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Tutup
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`font-mono text-lg font-bold ${
                  alertType === "success"
                    ? "text-emerald-600"
                    : alertType === "error"
                      ? "text-red-600"
                      : alertType === "warning"
                        ? "text-amber-600"
                        : "text-blue-600"
                }`}
              >
                {alertTitle}
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div
              className={`p-3 rounded-lg mb-4 ${
                alertType === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : alertType === "error"
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : alertType === "warning"
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
              }`}
            >
              <p className="text-sm">{alertMessage}</p>
            </div>

            <button
              onClick={() => setShowAlertModal(false)}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
