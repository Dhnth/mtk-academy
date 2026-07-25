"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  studentCount: number;
  totalIncome: number;
  totalExpense: number;
  createdAt: string;
}

export default function ManajemenPTPage() {
  const router = useRouter();

  // State
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guru/classes");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setClasses(data);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("Gagal memuat data kelas. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Filter classes by search
  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginatedClasses = filteredClasses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      // Cek apakah date valid
      if (isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return "-";
    }
  };

  // Hitung saldo (tidak pernah negatif)
  const calculateBalance = (income: number, expense: number): number => {
    const balance = income - expense;
    return balance < 0 ? 0 : balance;
  };

  // CRUD Operations
  const handleCreate = async () => {
    if (!formName.trim()) {
      alert("Nama kelas wajib diisi");
      return;
    }

    try {
      const res = await fetch("/api/guru/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal membuat kelas");
        return;
      }

      await fetchClasses();
      setShowCreateModal(false);
      setFormName("");
    } catch (err) {
      console.error("Error creating class:", err);
      alert("Terjadi kesalahan saat membuat kelas");
    }
  };

  const handleEdit = async () => {
    if (!formName.trim()) {
      alert("Nama kelas wajib diisi");
      return;
    }

    try {
      const res = await fetch("/api/guru/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: formName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal memperbarui kelas");
        return;
      }

      await fetchClasses();
      setShowEditModal(false);
      setFormName("");
      setEditId(null);
    } catch (err) {
      console.error("Error updating class:", err);
      alert("Terjadi kesalahan saat memperbarui kelas");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/guru/classes?id=${deleteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal menghapus kelas");
        return;
      }

      await fetchClasses();
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("Terjadi kesalahan saat menghapus kelas");
    }
  };

  // Navigate to detail page
  const handleViewDetail = (id: string) => {
    router.push(`/guru/manajemen-pt/${id}`);
  };

  // Open edit modal
  const openEditModal = (cls: ClassData) => {
    setEditId(cls.id);
    setFormName(cls.name);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-5 h-48"
            >
              <div className="h-6 w-32 bg-slate-200 rounded mb-3"></div>
              <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-20 bg-slate-200 rounded"></div>
            </div>
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
          onClick={() => fetchClasses()}
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
            Manajemen PT
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Kelola semua unit pelatihan (kelas) yang Anda bina.
          </p>
        </div>
        <button
          onClick={() => {
            setFormName("");
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-mono text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          Tambah PT
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari PT berdasarkan nama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Class Cards Grid */}
      {paginatedClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {searchTerm ? "PT Tidak Ditemukan" : "Belum Ada PT"}
          </h3>
          <p className="text-slate-500 text-center max-w-md">
            {searchTerm
              ? `Tidak ada PT dengan nama "${searchTerm}"`
              : "Mulai dengan membuat PT pertama Anda."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setFormName("");
                setShowCreateModal(true);
              }}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Buat PT Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedClasses.map((cls) => {
              const balance = calculateBalance(
                cls.totalIncome,
                cls.totalExpense,
              );
              const isDeficit = cls.totalExpense > cls.totalIncome;

              return (
                <div
                  key={cls.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-xl">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-slate-900 text-sm">
                          {cls.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatDate(cls.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetail(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Lihat Detail & Kelola Karyawan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(cls)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit PT"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus PT"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        <span className="font-bold text-slate-900">
                          {cls.studentCount}
                        </span>{" "}
                        Karyawan
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        Saldo:{" "}
                        <span
                          className={`font-bold ${
                            balance > 0 ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {formatCurrency(balance)}
                        </span>
                        {isDeficit && (
                          <span className="text-[10px] text-rose-500 ml-1 font-mono">
                            (Defisit)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span className="text-emerald-600">
                        ↑ {formatCurrency(cls.totalIncome)}
                      </span>
                      <span className="text-rose-500">
                        ↓ {formatCurrency(cls.totalExpense)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${
                            cls.totalIncome + cls.totalExpense > 0
                              ? Math.min(
                                  (cls.totalIncome /
                                    (cls.totalIncome + cls.totalExpense)) *
                                    100,
                                  100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                      <div
                        className="h-full bg-rose-400 transition-all duration-500"
                        style={{
                          width: `${
                            cls.totalIncome + cls.totalExpense > 0
                              ? Math.min(
                                  (cls.totalExpense /
                                    (cls.totalIncome + cls.totalExpense)) *
                                    100,
                                  100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-0.5">
                      <span>Pemasukan</span>
                      <span>Pengeluaran</span>
                    </div>
                  </div>

                  {/* Tombol Lihat Detail */}
                  <button
                    onClick={() => handleViewDetail(cls.id)}
                    className="mt-3 w-full py-2 text-xs font-mono font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Kelola Karyawan →
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm text-slate-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Buat PT Baru
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Masukkan nama PT (kelas) yang akan dibuat.
            </p>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: PT Lighter"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Edit PT
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Perbarui nama PT (kelas).
            </p>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: PT Lighter"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-red-600">
                Hapus PT
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">
                Apakah Anda yakin ingin menghapus PT ini? Tindakan ini tidak
                dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-mono text-sm font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
