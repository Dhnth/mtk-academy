import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRows } from "@/lib/db";
import { auth } from "@/auth";
import XLSX from "xlsx-js-style";

interface AttendanceData {
  id: string;
  student_id: string;
  student_name: string;
  student_username: string;
  class_id: string;
  class_name: string;
  status: string;
  created_at: string;
  created_by: string;
  creator_name: string;
}

interface ClassData {
  id: string;
  name: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userRole = (session?.user as unknown as Record<string, unknown>)
      ?.role as string | undefined;

    if (
      !session ||
      !userId ||
      !userRole ||
      !["ADMIN", "SECRETARY", "GURU"].includes(userRole)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil data kelas
    const classResult = await query<ClassData>(
      "SELECT id, name FROM classes WHERE id = $1",
      [id]
    );
    const classData = getFirstRow(classResult);

    if (!classData) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil parameter date dari query string
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date") || 
      new Date().toISOString().split("T")[0];

    // Ambil data kehadiran untuk kelas tersebut pada tanggal tertentu
    const attendanceResult = await query<AttendanceData>(
      `SELECT 
        a.id,
        a.student_id,
        u.name as student_name,
        u.username as student_username,
        a.class_id,
        c.name as class_name,
        a.status,
        a.created_at,
        a.created_by,
        creator.name as creator_name
      FROM attendances a
      JOIN users u ON u.id = a.student_id
      JOIN classes c ON c.id = a.class_id
      LEFT JOIN users creator ON creator.id = a.created_by
      WHERE a.class_id = $1 AND DATE(a.date) = $2
      ORDER BY u.name ASC`,
      [id, dateParam]
    );

    const attendances = getRows(attendanceResult);
    const className = classData.name;

    // Format tanggal untuk display
    const formattedDate = new Date(dateParam).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Statistik
    const total = attendances.length;
    const hadir = attendances.filter((a) => a.status === "HADIR").length;
    const izin = attendances.filter((a) => a.status === "IZIN").length;
    const sakit = attendances.filter((a) => a.status === "SAKIT").length;
    const alpha = attendances.filter((a) => a.status === "ALPHA").length;
    const disPen = attendances.filter((a) => a.status === "DIS PEN").length;

    // Prepare data untuk Excel
    const header = [
      "No",
      "Nama Lengkap",
      "Username",
      "Status",
      "Waktu Presensi",
      "Dibuat Oleh",
    ];

    const statusLabels: Record<string, string> = {
      HADIR: "Hadir",
      IZIN: "Izin",
      SAKIT: "Sakit",
      ALPHA: "Alpha",
      "DIS PEN": "Dispen",
    };

    const statusColors: Record<string, string> = {
      HADIR: "10B981",
      IZIN: "F59E0B",
      SAKIT: "3B82F6",
      ALPHA: "EF4444",
      "DIS PEN": "8B5CF6",
    };

    // Buat rows data
    const dataRows: (string | number)[][] = attendances.map(
      (att: AttendanceData, index: number) => {
        const time = new Date(att.created_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return [
          index + 1,
          att.student_name,
          att.student_username,
          statusLabels[att.status] || att.status,
          time,
          att.creator_name || "-",
        ];
      }
    );

    // Buat worksheet dengan data
    const wsData: (string | number)[][] = [
      [`REKAP KEHADIRAN - ${className}`],
      [`Tanggal: ${formattedDate}`],
      [],
      ["STATISTIK KEHADIRAN"],
      [`Total: ${total} Karyawan`],
      [`Hadir: ${hadir}`],
      [`Izin: ${izin}`],
      [`Sakit: ${sakit}`],
      [`Alpha: ${alpha}`],
      [`Dispen: ${disPen}`],
      [],
    ];

    wsData.push(header as (string | number)[]);
    
    dataRows.forEach((row) => {
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    ];

    const getCellAddress = (row: number, col: number) => {
      return XLSX.utils.encode_cell({ r: row, c: col });
    };

    // Style Title - Font Inter
    const titleStyle = {
      fill: { fgColor: { rgb: "1E40AF" } },
      font: { 
        bold: true, 
        color: { rgb: "FFFFFF" }, 
        sz: 16,
        name: "Poppins"
      },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const titleCell = getCellAddress(0, 0);
    if (ws[titleCell]) {
      ws[titleCell].s = titleStyle;
    }

    // Style Subtitle - Font Inter
    const subtitleStyle = {
      font: { sz: 12, name: "Poppins", color: { rgb: "4B5563" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    const subtitleCell = getCellAddress(1, 0);
    if (ws[subtitleCell]) {
      ws[subtitleCell].s = subtitleStyle;
    }

    // Style Statistik Header - Font Inter
    const statHeaderStyle = {
      fill: { fgColor: { rgb: "F3F4F6" } },
      font: { bold: true, sz: 12, name: "Poppins", color: { rgb: "1F2937" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "9CA3AF" } },
        bottom: { style: "medium", color: { rgb: "9CA3AF" } },
        left: { style: "medium", color: { rgb: "9CA3AF" } },
        right: { style: "medium", color: { rgb: "9CA3AF" } },
      },
    };
    const statHeaderCell = getCellAddress(3, 0);
    if (ws[statHeaderCell]) {
      ws[statHeaderCell].s = statHeaderStyle;
    }

    // Style statistik items - Font Inter
    const statItems = [
      { row: 4, color: "6B7280" },
      { row: 5, color: "10B981" },
      { row: 6, color: "F59E0B" },
      { row: 7, color: "3B82F6" },
      { row: 8, color: "EF4444" },
      { row: 9, color: "8B5CF6" },
    ];

    statItems.forEach((item) => {
      const cellAddr = getCellAddress(item.row, 0);
      if (ws[cellAddr]) {
        ws[cellAddr].s = {
          font: { 
            sz: 11, 
            name: "Poppins",
            color: { rgb: item.color },
            bold: true
          },
          alignment: { horizontal: "left", vertical: "center" },
        };
      }
    });

    // Style Table Header - Font Inter
    const tableHeaderStyle = {
      fill: { fgColor: { rgb: "2563EB" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Poppins" },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "1E40AF" } },
        bottom: { style: "thin", color: { rgb: "1E40AF" } },
        left: { style: "thin", color: { rgb: "1E40AF" } },
        right: { style: "thin", color: { rgb: "1E40AF" } },
      },
    };

    const headerStartRow = 11;
    for (let col = 0; col < header.length; col++) {
      const addr = getCellAddress(headerStartRow, col);
      if (ws[addr]) {
        ws[addr].s = tableHeaderStyle;
      }
    }

    // Style data cells - Font Inter
    const borderStyle = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } },
    };

    const dataStartRow = headerStartRow + 1;
    for (let r = dataStartRow; r < wsData.length; r++) {
      for (let c = 0; c < header.length; c++) {
        const addr = getCellAddress(r, c);
        if (ws[addr]) {
          if (c === 3) {
            const statusValue = String(ws[addr].v || "");
            let colorKey = "HADIR";
            for (const [key, value] of Object.entries(statusLabels)) {
              if (value === statusValue) {
                colorKey = key;
                break;
              }
            }
            const color = statusColors[colorKey] || "6B7280";
            
            ws[addr].s = {
              font: { 
                sz: 10, 
                name: "Poppins",
                color: { rgb: color },
                bold: true
              },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderStyle,
            };
          } else {
            ws[addr].s = {
              font: { sz: 10, name: "Poppins" },
              alignment: { 
                horizontal: c === 0 ? "center" : "left", 
                vertical: "center" 
              },
              border: borderStyle,
            };
          }
        }
      }
    }

    // Add summary footer - Font Inter
    const footerRow = wsData.length;
    const footerData = [
      "",
      "",
      "",
      `Total: ${total} Karyawan`,
      "",
      `Dicetak: ${new Date().toLocaleString("id-ID")}`,
    ];

    for (let c = 0; c < footerData.length; c++) {
      const addr = getCellAddress(footerRow, c);
      ws[addr] = { t: "s", v: footerData[c] };
      if (c === 3 || c === 5) {
        ws[addr].s = {
          font: { 
            sz: 10, 
            name: "Poppins",
            color: { rgb: "6B7280" },
            italic: c === 5
          },
          alignment: { horizontal: c === 3 ? "center" : "right", vertical: "center" },
        };
      }
    }

    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: footerRow, c: header.length - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const fileName = `Rekap_Kehadiran_${className}_${dateParam}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error exporting attendance:", error);
    return NextResponse.json(
      { error: "Gagal mengexport data kehadiran" },
      { status: 500 }
    );
  }
}