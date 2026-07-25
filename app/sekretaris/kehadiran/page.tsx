"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
  Clock,
  XCircle,
  Award,
  Users,
  Building2,
  Calendar,
  Search,
  X,
  Info,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  username: string;
  role: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPHA" | "DIS PEN" | null;
}

interface ClassData {
  id: string;
  name: string;
}

export default function KehadiranPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "info" | "confirm">("success");
  const [pendingSave, setPendingSave] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const today = new Date().toISOString().split("T")[0];

    try {
      // Get class info
      const classRes = await fetch("/api/sekretaris/class");
      if (!classRes.ok) throw new Error("Gagal mengambil data kelas");
      const classJson = await classRes.json();
      setClassData(classJson);

      // Get students with attendance (including secretary)
      const studentRes = await fetch(
        `/api/sekretaris/attendance?date=${today}`
      );
      if (!studentRes.ok) throw new Error("Gagal mengambil data siswa");
      const studentJson = await studentRes.json();
      setStudents(studentJson);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Gagal memuat data. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [students, debouncedSearchTerm]);

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, status: status as Student["status"] }
          : s
      )
    );
  };

  // Check if there are any non-HADIR statuses that will cause deduction
  const hasDeductionStatus = () => {
    return students.some((s) => 
      s.status && s.status !== "HADIR" && s.status !== null
    );
  };

  // Get summary of deductions
  const getDeductionSummary = () => {
    const deductionMap: Record<string, { label: string; amount: number }> = {
      "SAKIT": { label: "Sakit", amount: 2000000 },
      "DIS PEN": { label: "Dispen", amount: 1000000 },
      "IZIN": { label: "Izin", amount: 3000000 },
      "ALPHA": { label: "Alpha", amount: 50000000 },
    };

    const summary: Record<string, number> = {};
    let totalDeduction = 0;

    students.forEach((s) => {
      if (s.status && s.status !== "HADIR" && deductionMap[s.status]) {
        const statusKey = s.status;
        if (!summary[statusKey]) {
          summary[statusKey] = 0;
        }
        summary[statusKey]++;
        totalDeduction += deductionMap[statusKey].amount;
      }
    });

    return { summary, totalDeduction };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show confirmation modal before saving
  const handleSaveClick = () => {
    if (hasDeductionStatus()) {
      const { summary, totalDeduction } = getDeductionSummary();
      
      let deductionMessage = "Berikut rincian potongan saldo:\n\n";
      const deductionLabels: Record<string, string> = {
        "SAKIT": "Sakit",
        "IZIN": "Izin",
        "ALPHA": "Alpha",
        "DIS PEN": "Dispen",
      };
      
      Object.entries(summary).forEach(([status, count]) => {
        const label = deductionLabels[status] || status;
        const amount = {
          "SAKIT": 2000000,
          "IZIN": 3000000,
          "ALPHA": 50000000,
          "DIS PEN": 1000000,
        }[status] || 0;
        deductionMessage += `• ${label}: ${count} orang (${formatCurrency(amount)}/orang)\n`;
      });
      
      deductionMessage += `\nTotal potongan: ${formatCurrency(totalDeduction)}`;
      
      setModalTitle("Konfirmasi Simpan");
      setModalMessage(`Anda akan menyimpan absensi dengan status yang memiliki potongan saldo.\n\n${deductionMessage}\n\nApakah Anda yakin ingin melanjutkan?`);
      setModalType("confirm");
      setPendingSave(true);
      setShowModal(true);
    } else {
      // No deduction, save directly
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setError(null);

    const today = new Date().toISOString().split("T")[0];
    
    // Build status object - include all students
    const statusData: Record<string, string> = {};
    students.forEach((student) => {
      statusData[student.id] = student.status || "ALPHA";
    });

    try {
      const res = await fetch("/api/sekretaris/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          status: statusData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan absensi");
      }

      setSuccessMessage(`Absensi berhasil disimpan! (${data.success} data)`);
      
      // Show success modal with deduction info
      const deductionMessage = data.totalDeduction > 0 
        ? `Total potongan saldo: ${formatCurrency(data.totalDeduction)}`
        : "Tidak ada potongan saldo";
      
      setModalTitle("Berhasil!");
      setModalMessage(`Absensi berhasil disimpan untuk ${data.success} karyawan.\n\n${deductionMessage}`);
      setModalType("success");
      setPendingSave(false);
      setShowModal(true);
      
      await fetchData();
    } catch (err) {
      console.error("Error saving attendance:", err);
      const errorMsg = err instanceof Error ? err.message : "Gagal menyimpan absensi";
      setError(errorMsg);
      
      // Show error modal
      setModalTitle("Gagal!");
      setModalMessage(errorMsg);
      setModalType("error");
      setPendingSave(false);
      setShowModal(true);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      HADIR: "bg-emerald-100 text-emerald-700 border-emerald-200",
      IZIN: "bg-amber-100 text-amber-700 border-amber-200",
      SAKIT: "bg-blue-100 text-blue-700 border-blue-200",
      ALPHA: "bg-red-100 text-red-700 border-red-200",
      "DIS PEN": "bg-purple-100 text-purple-700 border-purple-200",
    };
    const labels: Record<string, string> = {
      HADIR: "Hadir",
      IZIN: "Izin",
      SAKIT: "Sakit",
      ALPHA: "Alpha",
      "DIS PEN": "Dispen",
    };
    const label = status ? labels[status] : "Belum";
    const style = status ? styles[status] : "bg-slate-100 text-slate-500 border-slate-200";
    return (
      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${style}`}>
        {label}
      </span>
    );
  };

  const getStatusIcon = (status: string | null) => {
    const icons: Record<string, React.ReactNode> = {
      HADIR: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      IZIN: <Clock className="w-4 h-4 text-amber-600" />,
      SAKIT: <User className="w-4 h-4 text-blue-600" />,
      ALPHA: <XCircle className="w-4 h-4 text-red-600" />,
      "DIS PEN": <Award className="w-4 h-4 text-purple-600" />,
    };
    return status ? icons[status] : null;
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      HADIR: "border-emerald-500 focus:ring-emerald-500",
      IZIN: "border-amber-500 focus:ring-amber-500",
      SAKIT: "border-blue-500 focus:ring-blue-500",
      ALPHA: "border-red-500 focus:ring-red-500",
      "DIS PEN": "border-purple-500 focus:ring-purple-500",
    };
    return status ? colors[status] : "";
  };

  const getRoleBadge = (role: string) => {
    if (role === "SECRETARY") {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-mono font-bold rounded ml-1">
          Sekre
        </span>
      );
    }
    return null;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
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
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Input Kehadiran
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Kelola absensi karyawan di PT {classData?.name || "..."}
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-purple-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Date Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-purple-600" />
        <span className="font-mono text-sm font-bold text-slate-900">
          {formatDate(new Date())}
        </span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-mono font-bold rounded">
          Hari Ini
        </span>
      </div>

      {/* Info Potongan */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <p className="font-bold">Info Potongan Saldo:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1">
            <span>Sakit: Rp 2.000.000</span>
            <span>Dispen: Rp 1.000.000</span>
            <span>Izin: Rp 3.000.000</span>
            <span className="text-red-600 font-bold">Alpha: Rp 50.000.000</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari karyawan berdasarkan nama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  No
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                  Username
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">
                      {debouncedSearchTerm
                        ? `Tidak ada karyawan dengan nama "${debouncedSearchTerm}"`
                        : "Belum ada karyawan di PT ini"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-slate-900 text-sm">
                            {student.name}
                          </p>
                          {getRoleBadge(student.role)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                          <span className="font-mono text-[10px] text-slate-400">
                            @{student.username}
                          </span>
                          {getStatusBadge(student.status)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-slate-500">
                        @{student.username}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(student.status)}
                        {getStatusBadge(student.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={student.status || "ALPHA"}
                        onChange={(e) =>
                          handleStatusChange(student.id, e.target.value)
                        }
                        className={`px-3 py-1.5 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white ${getStatusColor(
                          student.status
                        )}`}
                      >
                        <option value="HADIR">Hadir</option>
                        <option value="IZIN">Izin</option>
                        <option value="SAKIT">Sakit</option>
                        <option value="ALPHA">Alpha</option>
                        <option value="DIS PEN">Dispen</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-mono">
            {filteredStudents.length} dari {students.length} Karyawan
          </span>
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-mono text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Absensi
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-mono text-lg font-bold ${
                modalType === "success" ? "text-emerald-600" :
                modalType === "error" ? "text-red-600" :
                modalType === "confirm" ? "text-amber-600" :
                "text-blue-600"
              }`}>
                {modalTitle}
              </h3>
              {modalType !== "confirm" && (
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              )}
            </div>

            <div className={`p-3 rounded-lg mb-4 whitespace-pre-line ${
              modalType === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" :
              modalType === "error" ? "bg-red-50 border border-red-200 text-red-700" :
              modalType === "confirm" ? "bg-amber-50 border border-amber-200 text-amber-700" :
              "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <div className="flex items-start gap-3">
                {modalType === "success" && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                {modalType === "error" && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                {modalType === "confirm" && <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                <p className="text-sm whitespace-pre-line">{modalMessage}</p>
              </div>
            </div>

            {modalType === "confirm" ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPendingSave(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-mono text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPendingSave(false);
                    handleSave();
                  }}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-mono text-sm font-bold"
                >
                  Lanjutkan
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(false)}
                className={`w-full px-4 py-2.5 rounded-lg transition-colors font-mono text-sm font-bold ${
                  modalType === "success" 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : modalType === "error"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}