"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  UserPlus,
  UserCog,
  Wallet,
  Plus as PlusIcon,
  Minus,
  Building2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Upload,
  FileSpreadsheet,
  KeyRound,
  Shuffle,
} from "lucide-react";

interface Student {
  id: string;
  username: string;
  name: string;
  role: "STUDENT" | "SECRETARY";
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

interface ClassDetail {
  id: string;
  name: string;
  createdAt: string;
  stats: {
    totalStudents: number;
    totalIncome: number;
    totalExpense: number;
    averageLevel: number;
  };
}

export default function DetailKelasPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  // States
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswordResultModal, setShowPasswordResultModal] = useState(false);

  // Alert modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning" | "info">("info");

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"STUDENT" | "SECRETARY">("STUDENT");
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [balanceStudentId, setBalanceStudentId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [showPassword, setShowPassword] = useState(false);

  // Password states
  const [passwordStudentId, setPasswordStudentId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [isRandomPassword, setIsRandomPassword] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    message: string;
    success: string[];
    failed: { row: number; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy to clipboard
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Hitung saldo (tidak pernah negatif)
  const calculateBalance = (income: number, expense: number): number => {
    const balance = income - expense;
    return balance < 0 ? 0 : balance;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format angka dengan separator ribuan
  const formatNumberWithSeparator = (value: string): string => {
    const number = value.replace(/[^\d]/g, "");
    if (!number) return "";
    return new Intl.NumberFormat("id-ID").format(Number(number));
  };

  // Handle input balance dengan separator
  const handleBalanceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, "");
    if (rawValue === "") {
      setBalanceAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setBalanceAmount(formatted);
  };

  // Get numeric value from formatted string
  const getNumericValue = (formatted: string): number => {
    return Number(formatted.replace(/[^\d]/g, "")) || 0;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    if (role === "SECRETARY") {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-mono font-bold rounded">
          Sekre
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded">
        Siswa
      </span>
    );
  };

  // Show alert modal
  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const classRes = await fetch(`/api/guru/classes/${classId}`);
      if (!classRes.ok) throw new Error("Gagal mengambil detail kelas");
      const classDataJson = await classRes.json();
      setClassData(classDataJson);

      const studentRes = await fetch(`/api/guru/classes/${classId}/students`);
      if (!studentRes.ok) throw new Error("Gagal mengambil data siswa");
      const studentData = await studentRes.json();
      setStudents(studentData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Gagal memuat data. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Filter students with debounced search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  // CRUD Operations
  const handleAddStudent = async () => {
    if (!formUsername || !formName || !formPassword) {
      showAlert("Validasi Gagal", "Semua field wajib diisi", "error");
      return;
    }

    if (formUsername.length < 3) {
      showAlert("Validasi Gagal", "Username minimal 3 karakter", "error");
      return;
    }

    if (formPassword.length < 4) {
      showAlert("Validasi Gagal", "Password minimal 4 karakter", "error");
      return;
    }

    try {
      const res = await fetch(`/api/guru/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          name: formName,
          password: formPassword,
          role: formRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal menambahkan siswa", "error");
        return;
      }

      await fetchData();
      setShowAddModal(false);
      resetForm();
      showAlert("Berhasil", `Siswa ${formName} berhasil ditambahkan`, "success");
    } catch (err) {
      console.error("Error adding student:", err);
      showAlert("Error", "Terjadi kesalahan saat menambahkan siswa", "error");
    }
  };

  const handleUpdateRole = async () => {
    if (!editStudentId) return;

    try {
      const res = await fetch(
        `/api/guru/classes/${classId}/students/${editStudentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: formRole }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal memperbarui role", "error");
        return;
      }

      await fetchData();
      setShowEditRoleModal(false);
      setEditStudentId(null);
      showAlert("Berhasil", "Role berhasil diperbarui", "success");
    } catch (err) {
      console.error("Error updating role:", err);
      showAlert("Error", "Terjadi kesalahan saat memperbarui role", "error");
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;

    try {
      const res = await fetch(
        `/api/guru/classes/${classId}/students/${deleteStudentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal menghapus siswa", "error");
        return;
      }

      await fetchData();
      setShowDeleteModal(false);
      setDeleteStudentId(null);
      showAlert("Berhasil", "Karyawan berhasil dihapus", "success");
    } catch (err) {
      console.error("Error deleting student:", err);
      showAlert("Error", "Terjadi kesalahan saat menghapus siswa", "error");
    }
  };

  const handleUpdateBalance = async () => {
    if (!balanceStudentId) return;
    const numericAmount = getNumericValue(balanceAmount);
    if (numericAmount <= 0) {
      showAlert("Validasi Gagal", "Masukkan jumlah yang valid", "error");
      return;
    }

    try {
      const res = await fetch(
        `/api/guru/classes/${classId}/students/${balanceStudentId}/balance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount,
            type: balanceType,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal memperbarui saldo", "error");
        return;
      }

      await fetchData();
      setShowBalanceModal(false);
      setBalanceStudentId(null);
      setBalanceAmount("");
      showAlert("Berhasil", `Saldo berhasil ${balanceType === "INCOME" ? "ditambahkan" : "dikurangi"}`, "success");
    } catch (err) {
      console.error("Error updating balance:", err);
      showAlert("Error", "Terjadi kesalahan saat memperbarui saldo", "error");
    }
  };

  // Generate random password
  const generateRandomPassword = async () => {
    setIsGeneratingPassword(true);
    try {
      const res = await fetch("/api/guru/generate-password");
      const data = await res.json();
      setNewPassword(data.password);
      setIsRandomPassword(true);
      setPasswordCopied(false);
      // Tutup modal password, buka modal result
      setShowPasswordModal(false);
      setShowPasswordResultModal(true);
    } catch (err) {
      console.error("Error generating password:", err);
      showAlert("Error", "Gagal generate password", "error");
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  // Handle change password (manual input)
  const handleChangePassword = async () => {
    if (!passwordStudentId) return;
    if (!newPassword || newPassword.length < 4) {
      showAlert("Validasi Gagal", "Password minimal 4 karakter", "error");
      return;
    }

    try {
      const res = await fetch(
        `/api/guru/classes/${classId}/students/${passwordStudentId}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal", data.error || "Gagal mengubah password", "error");
        return;
      }

      await fetchData();
      setShowPasswordModal(false);
      setPasswordStudentId(null);
      setNewPassword("");
      setPasswordCopied(false);
      setIsRandomPassword(false);
      showAlert("Berhasil", "Password berhasil diubah", "success");
    } catch (err) {
      console.error("Error changing password:", err);
      showAlert("Error", "Terjadi kesalahan saat mengubah password", "error");
    }
  };

  // Copy password to clipboard (from result modal)
  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setPasswordCopied(true);
  };

  // Close password result modal
  const closePasswordResultModal = () => {
    setShowPasswordResultModal(false);
    setPasswordStudentId(null);
    setNewPassword("");
    setPasswordCopied(false);
    setIsRandomPassword(false);
  };

  // Export function
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/guru/classes/${classId}/export`);
      if (!res.ok) {
        const error = await res.json();
        showAlert("Gagal Export", error.error || "Gagal mengexport data", "error");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `Data_Karyawan_${classData?.name || "kelas"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showAlert("Berhasil", "Data berhasil diexport", "success");
    } catch (err) {
      console.error("Error exporting:", err);
      showAlert("Error", "Gagal mengexport data", "error");
    }
  };

  // Import function
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
      const res = await fetch(`/api/guru/classes/${classId}/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Gagal Import", data.error || "Gagal mengimport data", "error");
        return;
      }

      setImportResult(data.results);
      await fetchData();

      if (data.results.failed.length === 0) {
        showAlert("Berhasil", `${data.results.success.length} siswa berhasil diimport`, "success");
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }, 1000);
      } else {
        showAlert(
          "Import Selesai",
          `${data.results.success.length} berhasil, ${data.results.failed.length} gagal`,
          "warning"
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
  const downloadTemplate = async () => {
    try {
      const res = await fetch(`/api/guru/classes/${classId}/template`);
      if (!res.ok) {
        const error = await res.json();
        showAlert("Gagal", error.error || "Gagal mendownload template", "error");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Template_Import_Karyawan.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading template:", err);
      showAlert("Error", "Gagal mendownload template", "error");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormUsername("");
    setFormName("");
    setFormPassword("");
    setFormRole("STUDENT");
    setShowPassword(false);
  };

  // Open modals
  const openEditRoleModal = (student: Student) => {
    setEditStudentId(student.id);
    setFormRole(student.role);
    setShowEditRoleModal(true);
  };

  const openDeleteModal = (id: string) => {
    setDeleteStudentId(id);
    setShowDeleteModal(true);
  };

  const openBalanceModal = (student: Student) => {
    setBalanceStudentId(student.id);
    setBalanceAmount("");
    setBalanceType("INCOME");
    setShowBalanceModal(true);
  };

  const openPasswordModal = (student: Student) => {
    setPasswordStudentId(student.id);
    setNewPassword("");
    setShowNewPassword(false);
    setPasswordCopied(false);
    setIsRandomPassword(false);
    setShowPasswordModal(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 rounded mt-1"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl mb-2"></div>
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Kelas Tidak Ditemukan</h3>
        <button
          onClick={() => router.push("/guru/manajemen-pt")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Kembali ke Manajemen PT
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push("/guru/manajemen-pt")}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-[150px]">
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            {classData.name}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Manajemen karyawan PT {classData.name} • Dibuat {formatDate(classData.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-mono font-bold"
            title="Export ke Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-mono font-bold"
            title="Import dari Excel"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Total Karyawan
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900">
            {classData.stats.totalStudents}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Rata-rata Level
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900">
            {classData.stats.averageLevel}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Total Pemasukan
          </p>
          <p className="font-mono text-sm font-bold text-emerald-600">
            {formatCurrency(classData.stats.totalIncome)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Total Pengeluaran
          </p>
          <p className="font-mono text-sm font-bold text-rose-600">
            {formatCurrency(classData.stats.totalExpense)}
          </p>
        </div>
      </div>

      {/* Student Management */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-mono text-base font-bold text-slate-900">
              Daftar Karyawan
            </h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded">
              {students.length}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-mono font-bold whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Karyawan
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  #
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                  Username
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden md:table-cell">
                  Level
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Saldo
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                  M/K
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {debouncedSearchTerm
                      ? `Tidak ada karyawan dengan nama "${debouncedSearchTerm}"`
                      : "Belum ada karyawan di PT ini"}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const balance = calculateBalance(student.income, student.expense);
                  const isDeficit = student.expense > student.income;

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 sm:hidden">
                            <span className="font-mono text-[10px] text-slate-400">
                              @{student.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-slate-500">
                          @{student.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(student.role)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {student.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span
                            className={`font-mono text-xs font-bold ${
                              balance > 0 ? "text-emerald-600" : "text-slate-400"
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                          {isDeficit && (
                            <span className="text-[9px] text-rose-500 ml-1 font-mono">
                              (Defisit)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => openBalanceModal(student)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors text-xs font-mono font-bold"
                            title="Tambah Saldo"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setBalanceStudentId(student.id);
                              setBalanceAmount("");
                              setBalanceType("EXPENSE");
                              setShowBalanceModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors text-xs font-mono font-bold"
                            title="Kurangi Saldo"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-600 font-bold">
                            {student.wins}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 font-bold">
                            {student.losses}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => copyToClipboard(student.username, student.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copy Username"
                          >
                            {copiedId === student.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openPasswordModal(student)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Ganti Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditRoleModal(student)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Ubah Role"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(student.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Tambah Karyawan
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Minimal 3 karakter"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as "STUDENT" | "SECRETARY")}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="STUDENT">Siswa</option>
                  <option value="SECRETARY">Sekretaris</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleAddStudent}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Ubah Role
              </h3>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as "STUDENT" | "SECRETARY")}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="STUDENT">Siswa</option>
                <option value="SECRETARY">Sekretaris</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRole}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE STUDENT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-red-600">
                Hapus Karyawan
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
                Apakah Anda yakin ingin menghapus karyawan ini? Tindakan ini tidak
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
                onClick={handleDeleteStudent}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-mono text-sm font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE MODAL */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                {balanceType === "INCOME" ? "Tambah Saldo" : "Kurangi Saldo"}
              </h3>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Jumlah (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={balanceAmount}
                  onChange={handleBalanceInputChange}
                  placeholder="Masukkan jumlah..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono text-right"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {balanceAmount && `Rp ${balanceAmount}`}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg text-sm ${
                  balanceType === "INCOME"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}
              >
                {balanceType === "INCOME"
                  ? "Menambahkan saldo akan meningkatkan pemasukan"
                  : "Mengurangi saldo akan mengurangi pemasukan terlebih dahulu, jika tidak cukup akan dicatat sebagai pengeluaran"}
              </div>
              {balanceAmount && balanceStudentId && (() => {
                const student = students.find(s => s.id === balanceStudentId);
                if (!student) return null;
                const amount = getNumericValue(balanceAmount);
                const currentBalance = student.income - student.expense;
                let newIncome = student.income;
                let newExpense = student.expense;
                
                if (balanceType === "INCOME") {
                  newIncome = student.income + amount;
                } else {
                  if (currentBalance >= amount) {
                    newIncome = student.income - amount;
                  } else {
                    newIncome = 0;
                    newExpense = student.expense + (amount - currentBalance);
                  }
                }
                const newBalance = newIncome - newExpense;
                
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-mono text-slate-600">
                      Saldo saat ini: <span className="font-bold">{formatCurrency(currentBalance < 0 ? 0 : currentBalance)}</span>
                    </p>
                    <p className="text-xs font-mono text-slate-600 mt-1">
                      Saldo baru: <span className={`font-bold ${newBalance > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {formatCurrency(newBalance < 0 ? 0 : newBalance)}
                      </span>
                    </p>
                    {balanceType === "EXPENSE" && currentBalance < amount && (
                      <p className="text-xs text-rose-600 mt-1">
                        Saldo tidak cukup, kelebihan akan dicatat sebagai pengeluaran
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateBalance}
                className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-mono text-sm font-bold ${
                  balanceType === "INCOME"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {balanceType === "INCOME" ? "Tambah" : "Kurangi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Ganti Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordStudentId(null);
                  setNewPassword("");
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Password baru akan digunakan untuk login siswa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono pr-10"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={generateRandomPassword}
                    disabled={isGeneratingPassword}
                    className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1 text-sm font-mono font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shuffle className="w-4 h-4" />
                    Acak
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {newPassword.length < 4 && newPassword.length > 0 
                    ? `Password minimal 4 karakter (${newPassword.length}/4)` 
                    : newPassword.length >= 4 
                      ? `Password valid (${newPassword.length} karakter)` 
                      : "Minimal 4 karakter"}
                </p>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={newPassword.length < 4}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESULT MODAL (untuk password acak) */}
      {showPasswordResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Password Baru
              </h3>
              <button
                onClick={() => {
                  if (!passwordCopied) {
                    if (!confirm("Password belum disalin. Yakin ingin menutup?")) return;
                  }
                  closePasswordResultModal();
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700 font-medium">
                  Password berhasil digenerate!
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Silakan salin password berikut untuk diberikan ke siswa.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-mono text-xl font-bold text-slate-900 text-center tracking-wider select-all">
                  {newPassword}
                </p>
              </div>

              {passwordCopied ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">
                    Password berhasil disalin!
                  </p>
                </div>
              ) : (
                <button
                  onClick={copyPasswordToClipboard}
                  className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-mono text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Password
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (!passwordCopied) {
                    if (!confirm("Password belum disalin. Yakin ingin menutup?")) return;
                  }
                  closePasswordResultModal();
                }}
                className={`flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-emerald-50 transition-colors font-mono text-sm font-bold `}
              >
                {passwordCopied ? "Tutup" : "Selesai"}
              </button>
              {passwordCopied && (
                <button
                  onClick={closePasswordResultModal}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-bold"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-mono text-lg font-bold ${
                alertType === "success" ? "text-emerald-600" :
                alertType === "error" ? "text-red-600" :
                alertType === "warning" ? "text-amber-600" :
                "text-blue-600"
              }`}>
                {alertTitle}
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className={`p-3 rounded-lg mb-4 ${
              alertType === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" :
              alertType === "error" ? "bg-red-50 border border-red-200 text-red-700" :
              alertType === "warning" ? "bg-amber-50 border border-amber-200 text-amber-700" :
              "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
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

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-slate-900">
                Import Karyawan dari Excel
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
                  <div className="grid grid-cols-4 gap-2 bg-blue-100 p-1.5 rounded font-bold">
                    <span>Nama Lengkap</span>
                    <span>Username</span>
                    <span>Password</span>
                    <span>Role</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 bg-white p-1.5 rounded border border-blue-100">
                    <span>Andi Wijaya</span>
                    <span>andi_12</span>
                    <span>rahasia123</span>
                    <span>Siswa</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 bg-white p-1.5 rounded border border-blue-100">
                    <span>Budi Santoso</span>
                    <span>budi_12</span>
                    <span>rahasia456</span>
                    <span>Sekretaris</span>
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  Role: &quot;Siswa&quot; atau &quot;Sekretaris&quot;
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
                        if (fileInputRef.current) fileInputRef.current.value = "";
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
                      {importResult.success.length} siswa berhasil diimport
                    </p>
                    {importResult.success.length > 0 && (
                      <p className="text-xs text-emerald-600 mt-1 line-clamp-2">
                        {importResult.success.join(", ")}
                      </p>
                    )}
                  </div>
                  {importResult.failed.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-h-[150px] overflow-y-auto">
                      <p className="text-sm text-red-700 font-medium">
                        {importResult.failed.length} siswa gagal diimport
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
    </div>
  );
}