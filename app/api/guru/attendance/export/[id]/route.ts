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
  date: string;
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

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate") || startDate || 
      new Date().toISOString().split("T")[0];

    let dateFilter = "";
    let queryParams: (string | number)[] = [id];
    
    if (startDate && endDate && startDate !== endDate) {
      dateFilter = "AND a.date BETWEEN $2 AND $3";
      queryParams = [id, startDate, endDate];
    } else if (startDate) {
      dateFilter = "AND a.date = $2";
      queryParams = [id, startDate];
    } else {
      const today = new Date().toISOString().split("T")[0];
      dateFilter = "AND a.date = $2";
      queryParams = [id, today];
    }

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
        a.date,
        creator.name as creator_name
      FROM attendances a
      JOIN users u ON u.id = a.student_id
      JOIN classes c ON c.id = a.class_id
      LEFT JOIN users creator ON creator.id = a.created_by
      WHERE a.class_id = $1 ${dateFilter}
      ORDER BY a.date ASC, u.name ASC`,
      queryParams
    );

    const attendances = getRows(attendanceResult);
    const className = classData.name;

    const displayStartDate = startDate || new Date().toISOString().split("T")[0];
    const displayEndDate = endDate || displayStartDate;
    
    const formattedStartDate = new Date(displayStartDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedEndDate = new Date(displayEndDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const dateRangeText = displayStartDate === displayEndDate 
      ? formattedStartDate 
      : `${formattedStartDate} - ${formattedEndDate}`;

    // Group by date
    const groupedByDate: Record<string, AttendanceData[]> = {};
    attendances.forEach((att) => {
      const dateKey = att.date;
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(att);
    });

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

    // Build worksheet data with date sections
    const wsData: (string | number)[][] = [
      [`REKAP KEHADIRAN - ${className}`],
      [`Periode: ${dateRangeText}`],
      [],
    ];

    const dateKeys = Object.keys(groupedByDate).sort();

    dateKeys.forEach((dateKey, dateIndex) => {
      const dateAttendances = groupedByDate[dateKey];
      const dateObj = new Date(dateKey);
      const formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const total = dateAttendances.length;
      const hadir = dateAttendances.filter((a) => a.status === "HADIR").length;
      const izin = dateAttendances.filter((a) => a.status === "IZIN").length;
      const sakit = dateAttendances.filter((a) => a.status === "SAKIT").length;
      const alpha = dateAttendances.filter((a) => a.status === "ALPHA").length;
      const disPen = dateAttendances.filter((a) => a.status === "DIS PEN").length;

      // Date header
      wsData.push([`📅 ${formattedDate}`]);
      wsData.push([
        `Total: ${total} | Hadir: ${hadir} | Izin: ${izin} | Sakit: ${sakit} | Alpha: ${alpha} | Dispen: ${disPen}`
      ]);
      wsData.push([]);

      // Table header for this date
      wsData.push(["No", "Nama Lengkap", "Username", "Status", "Waktu Presensi", "Dibuat Oleh"]);

      // Data rows for this date
      dateAttendances.forEach((att, index) => {
        const time = new Date(att.created_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        wsData.push([
          index + 1,
          att.student_name,
          att.student_username,
          statusLabels[att.status] || att.status,
          time,
          att.creator_name || "-",
        ]);
      });

      // Empty row between dates (except after last)
      if (dateIndex < dateKeys.length - 1) {
        wsData.push([]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];

    // Get cell address helper
    const getCellAddress = (row: number, col: number) => {
      return XLSX.utils.encode_cell({ r: row, c: col });
    };

    // Track current row for styling
    let currentRow = 0;

    // Style Title
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
    const titleCell = getCellAddress(currentRow, 0);
    if (ws[titleCell]) {
      ws[titleCell].s = titleStyle;
    }
    // Merge title
    ws["!merges"] = [{ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } }];
    currentRow++;

    // Style Subtitle
    const subtitleStyle = {
      font: { sz: 12, name: "Poppins", color: { rgb: "4B5563" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    const subtitleCell = getCellAddress(currentRow, 0);
    if (ws[subtitleCell]) {
      ws[subtitleCell].s = subtitleStyle;
    }
    // Merge subtitle
    ws["!merges"]!.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
    currentRow++;
    currentRow++; // empty row

    // Style each date section
    dateKeys.forEach((dateKey, dateIndex) => {
      // Date header style
      const dateHeaderStyle = {
        fill: { fgColor: { rgb: "E5E7EB" } },
        font: { bold: true, sz: 13, name: "Poppins", color: { rgb: "1F2937" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
      const dateHeaderCell = getCellAddress(currentRow, 0);
      if (ws[dateHeaderCell]) {
        ws[dateHeaderCell].s = dateHeaderStyle;
      }
      // Merge date header
      ws["!merges"]!.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
      currentRow++;

      // Summary row style
      const summaryStyle = {
        font: { sz: 11, name: "Poppins", color: { rgb: "4B5563" }, italic: true },
        alignment: { horizontal: "left", vertical: "center" },
      };
      const summaryCell = getCellAddress(currentRow, 0);
      if (ws[summaryCell]) {
        ws[summaryCell].s = summaryStyle;
      }
      // Merge summary
      ws["!merges"]!.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
      currentRow++;
      currentRow++; // empty row

      // Table header style
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

      const dateAttendances = groupedByDate[dateKey];
      const headerStartRow = currentRow;
      for (let col = 0; col < 6; col++) {
        const addr = getCellAddress(headerStartRow, col);
        if (ws[addr]) {
          ws[addr].s = tableHeaderStyle;
        }
      }
      currentRow++;

      // Data rows style
      const borderStyle = {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } },
      };

      const dataStartRow = currentRow;
      dateAttendances.forEach((att, idx) => {
        const row = dataStartRow + idx;
        for (let c = 0; c < 6; c++) {
          const addr = getCellAddress(row, c);
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
        currentRow++;
      });

      // Empty row after date section (except after last)
      if (dateIndex < dateKeys.length - 1) {
        currentRow++;
      }
    });

    // Add footer
    const footerRow = currentRow;
    const footerData = [
      "",
      "",
      "",
      `Total Seluruh Data: ${attendances.length} Karyawan`,
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

    // Update range
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: footerRow, c: 5 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const dateStr = startDate && endDate && startDate !== endDate 
      ? `${startDate}_to_${endDate}` 
      : (startDate || new Date().toISOString().split("T")[0]);
    const fileName = `Rekap_Kehadiran_${className}_${dateStr}.xlsx`;

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