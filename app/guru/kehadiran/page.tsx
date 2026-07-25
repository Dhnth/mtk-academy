"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
  Clock,
  XCircle,
  Award,
  Users,
  Calendar,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AttendanceData {
  id: string;
  student_id: string;
  student_name: string;
  student_username: string;
  class_id: string;
  class_name: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPHA" | "DIS PEN";
  created_at: string;
}

interface AttendanceSummary {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  disPen: number;
}

interface ClassGroup {
  classId: string;
  className: string;
  students: AttendanceData[];
  summary: AttendanceSummary;
}

export default function GuruKehadiranPage() {
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    try {
      const res = await fetch(`/api/guru/attendance?date=${today}`);
      if (!res.ok) throw new Error("Gagal mengambil data kehadiran");
      const data = await res.json();
      setAttendance(data);

      // Hitung summary global
      const summaryData: AttendanceSummary = {
        total: data.length,
        hadir: data.filter((a: AttendanceData) => a.status === "HADIR").length,
        izin: data.filter((a: AttendanceData) => a.status === "IZIN").length,
        sakit: data.filter((a: AttendanceData) => a.status === "SAKIT").length,
        alpha: data.filter((a: AttendanceData) => a.status === "ALPHA").length,
        disPen: data.filter((a: AttendanceData) => a.status === "DIS PEN").length,
      };
      setSummary(summaryData);

      // Group by class
      const groups: Record<string, ClassGroup> = {};
      data.forEach((item: AttendanceData) => {
        if (!groups[item.class_id]) {
          groups[item.class_id] = {
            classId: item.class_id,
            className: item.class_name,
            students: [],
            summary: { total: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0, disPen: 0 },
          };
        }
        groups[item.class_id].students.push(item);
        // Update class summary
        const cls = groups[item.class_id];
        cls.summary.total++;
        if (item.status === "HADIR") cls.summary.hadir++;
        else if (item.status === "IZIN") cls.summary.izin++;
        else if (item.status === "SAKIT") cls.summary.sakit++;
        else if (item.status === "ALPHA") cls.summary.alpha++;
        else if (item.status === "DIS PEN") cls.summary.disPen++;
      });

      const groupList = Object.values(groups);
      setClassGroups(groupList);

      // Auto expand all classes
      const allClassIds = new Set(groupList.map(g => g.classId));
      setExpandedClasses(allClassIds);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError("Gagal memuat data kehadiran. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Filter attendance by search
  const filteredGroups = classGroups
    .map((group) => ({
      ...group,
      students: group.students.filter(
        (a) =>
          a.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.student_username.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.students.length > 0);

  const toggleExpand = (classId: string) => {
    setExpandedClasses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
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
    const label = labels[status] || status;
    const style = styles[status] || "bg-slate-100 text-slate-500 border-slate-200";
    return (
      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${style}`}>
        {label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      HADIR: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      IZIN: <Clock className="w-4 h-4 text-amber-600" />,
      SAKIT: <User className="w-4 h-4 text-blue-600" />,
      ALPHA: <XCircle className="w-4 h-4 text-red-600" />,
      "DIS PEN": <Award className="w-4 h-4 text-purple-600" />,
    };
    return icons[status] || null;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
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
          <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 h-20">
              <div className="h-4 w-12 bg-slate-200 rounded mx-auto mb-2"></div>
              <div className="h-6 w-8 bg-slate-200 rounded mx-auto"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 mb-3">
              <div className="h-5 w-48 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => fetchAttendance()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const hasData = attendance.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
            Rekap Kehadiran
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            {hasData 
              ? `Kehadiran karyawan hari ini (${formatDate(new Date())})`
              : "Belum ada data kehadiran hari ini"}
          </p>
        </div>
        <button
          onClick={() => fetchAttendance()}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Date Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span className="font-mono text-sm font-bold text-slate-900">
          {formatDate(new Date())}
        </span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-mono font-bold rounded">
          Hari Ini
        </span>
        {hasData && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded ml-auto">
            {attendance.length} Karyawan
          </span>
        )}
      </div>

      {/* No Data State */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-2xl">
          <Users className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Belum Ada Info Kehadiran
          </h3>
          <p className="text-slate-500 text-center max-w-md">
            Belum ada data kehadiran karyawan hari ini dari sekretaris. 
            Mohon tunggu hingga sekretaris menginput kehadiran.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-emerald-600">
                {summary?.hadir || 0}
              </p>
              <p className="text-[10px] font-mono text-emerald-600">Hadir</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-amber-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-amber-600">
                {summary?.izin || 0}
              </p>
              <p className="text-[10px] font-mono text-amber-600">Izin</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <User className="w-5 h-5 text-blue-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-blue-600">
                {summary?.sakit || 0}
              </p>
              <p className="text-[10px] font-mono text-blue-600">Sakit</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <XCircle className="w-5 h-5 text-red-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-red-600">
                {summary?.alpha || 0}
              </p>
              <p className="text-[10px] font-mono text-red-600">Alpha</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <Award className="w-5 h-5 text-purple-600 mx-auto" />
              <p className="font-mono text-xl font-bold text-purple-600">
                {summary?.disPen || 0}
              </p>
              <p className="text-[10px] font-mono text-purple-600">Dispen</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari karyawan berdasarkan nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Class Groups */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">
                  {searchTerm
                    ? `Tidak ada karyawan dengan nama "${searchTerm}"`
                    : "Tidak ada data kehadiran yang sesuai"}
                </p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = expandedClasses.has(group.classId);
                return (
                  <div
                    key={group.classId}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
                  >
                    {/* Class Header */}
                    <button
                      onClick={() => toggleExpand(group.classId)}
                      className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-mono font-bold text-sm text-slate-900 truncate">
                            {group.className}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500">
                              {group.students.length} karyawan
                            </span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] font-mono text-emerald-600">
                              Hadir: {group.summary.hadir}
                            </span>
                            <span className="text-[10px] font-mono text-amber-600">
                              Izin: {group.summary.izin}
                            </span>
                            <span className="text-[10px] font-mono text-red-600">
                              Alpha: {group.summary.alpha}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {isExpanded ? "Tutup" : "Buka"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Students List */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {group.students.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">
                                  {item.student_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="font-mono text-[10px] text-slate-400 truncate">
                                    @{item.student_username}
                                  </span>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    {formatTime(item.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusIcon(item.status)}
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}