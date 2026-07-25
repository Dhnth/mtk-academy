import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRows } from "@/lib/db";
import XLSX from "xlsx-js-style";

interface ClassRow {
  id: string;
  name: string;
  created_at: string;
}

interface StudentRow {
  name: string;
  username: string;
  role: string;
  level: number;
  exp: number;
  income: number;
  expense: number;
  wins: number;
  losses: number;
  created_at: string;
}

// GET - Export data siswa ke Excel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil data kelas
    const classResult = await query<ClassRow>(
      "SELECT id, name, created_at FROM classes WHERE id = $1",
      [id]
    );

    const classData = getFirstRow(classResult);

    if (!classData) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil data siswa
    const studentsResult = await query<StudentRow>(
      `SELECT 
        name,
        username,
        role,
        level,
        exp,
        income,
        expense,
        wins,
        losses,
        created_at
      FROM users 
      WHERE class_id = $1 AND role IN ('STUDENT', 'SECRETARY')
      ORDER BY role DESC, name ASC`,
      [id]
    );

    const students = getRows(studentsResult);
    const className = classData.name;

    // Prepare data for Excel
    const header = [
      "No",
      "Nama Lengkap",
      "Username",
      "Role",
      "Level",
      "Exp",
      "Pemasukan (Rp)",
      "Pengeluaran (Rp)",
      "Saldo (Rp)",
      "Menang",
      "Kalah",
      "Tanggal Bergabung",
    ];

    const rows = students.map((student, index: number) => {
      const income = Number(student.income || 0);
      const expense = Number(student.expense || 0);
      const balance = income - expense < 0 ? 0 : income - expense;

      return [
        index + 1,
        student.name,
        student.username,
        student.role === "SECRETARY" ? "Sekretaris" : "Siswa",
        Number(student.level || 1),
        Number(student.exp || 0),
        income,
        expense,
        balance,
        Number(student.wins || 0),
        Number(student.losses || 0),
        student.created_at
          ? new Date(student.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-",
      ];
    });

    // Buat worksheet dengan data
    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 }, // No
      { wch: 25 }, // Nama
      { wch: 20 }, // Username
      { wch: 12 }, // Role
      { wch: 8 }, // Level
      { wch: 10 }, // Exp
      { wch: 18 }, // Pemasukan
      { wch: 18 }, // Pengeluaran
      { wch: 18 }, // Saldo
      { wch: 10 }, // Menang
      { wch: 10 }, // Kalah
      { wch: 18 }, // Tanggal
    ];

    // Style Header
    const headerStyle = {
      fill: { fgColor: { rgb: "2563EB" } }, // Biru
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "JetBrains Mono" },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "1E40AF" } },
        bottom: { style: "thin", color: { rgb: "1E40AF" } },
        left: { style: "thin", color: { rgb: "1E40AF" } },
        right: { style: "thin", color: { rgb: "1E40AF" } },
      },
    };

    // Apply header style
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[addr]) {
        ws[addr].s = headerStyle;
      }
    }

    // Style data cells
    const borderStyle = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } },
    };

    for (let r = 1; r < wsData.length; r++) {
      for (let c = 0; c < header.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
          ws[addr].s = {
            font: { sz: 10, name: "Inter" },
            alignment: {
              horizontal: c === 0 ? "center" : "left",
              vertical: "center",
            },
            border: borderStyle,
          };

          // Color for balance column (index 8)
          if (c === 8) {
            const balance = Number(ws[addr].v || 0);
            ws[addr].s = {
              ...ws[addr].s,
              font: {
                ...ws[addr].s.font,
                color: { rgb: balance > 0 ? "059669" : "6B7280" },
                bold: balance > 0,
              },
            };
          }

          // Color for role column (index 3)
          if (c === 3) {
            const role = String(ws[addr].v || "");
            ws[addr].s = {
              ...ws[addr].s,
              font: {
                ...ws[addr].s.font,
                color: {
                  rgb: role === "Sekretaris" ? "7C3AED" : "2563EB",
                },
                bold: true,
              },
            };
          }
        }
      }
    }

    // Add summary row
    const totalIncome = students.reduce(
      (sum, s) => sum + Number(s.income || 0),
      0
    );
    const totalExpense = students.reduce(
      (sum, s) => sum + Number(s.expense || 0),
      0
    );
    const totalBalance = totalIncome - totalExpense < 0 ? 0 : totalIncome - totalExpense;

    const summaryRow = [
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      totalIncome,
      totalExpense,
      totalBalance,
      "",
      "",
      "",
    ];

    const summaryStartRow = wsData.length;
    wsData.push(summaryRow);

    // Style summary row
    for (let c = 0; c < summaryRow.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: summaryStartRow, c });
      if (ws[addr]) {
        ws[addr].s = {
          fill: { fgColor: { rgb: "F3F4F6" } },
          font: { bold: true, sz: 10, name: "JetBrains Mono", color: { rgb: "1F2937" } },
          alignment: { horizontal: c === 5 ? "right" : "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "9CA3AF" } },
            bottom: { style: "medium", color: { rgb: "9CA3AF" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } },
          },
        };
      }
    }

    // Update range
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: summaryStartRow, c: header.length - 1 },
    });

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Karyawan");

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${className}_${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error exporting students:", error);
    return NextResponse.json(
      { error: "Gagal mengexport data siswa" },
      { status: 500 }
    );
  }
}
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // No
        { wch: 25 }, // Nama
        { wch: 20 }, // Username
        { wch: 12 }, // Role
        { wch: 8 }, // Level
        { wch: 10 }, // Exp
        { wch: 18 }, // Pemasukan
        { wch: 18 }, // Pengeluaran
        { wch: 18 }, // Saldo
        { wch: 10 }, // Menang
        { wch: 10 }, // Kalah
        { wch: 18 }, // Tanggal
      ];

      // Style Header
      const headerStyle = {
        fill: { fgColor: { rgb: "2563EB" } }, // Biru
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "JetBrains Mono" },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "1E40AF" } },
          bottom: { style: "thin", color: { rgb: "1E40AF" } },
          left: { style: "thin", color: { rgb: "1E40AF" } },
          right: { style: "thin", color: { rgb: "1E40AF" } },
        },
      };

      // Apply header style
      const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[addr]) {
          ws[addr].s = headerStyle;
        }
      }

      // Style data cells
      const borderStyle = {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } },
      };

      for (let r = 1; r < wsData.length; r++) {
        for (let c = 0; c < header.length; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws[addr]) {
            ws[addr].s = {
              font: { sz: 10, name: "Inter" },
              alignment: {
                horizontal: c === 0 ? "center" : "left",
                vertical: "center",
              },
              border: borderStyle,
            };

            // Color for balance column (index 8)
            if (c === 8) {
              const balance = Number(ws[addr].v || 0);
              ws[addr].s = {
                ...ws[addr].s,
                font: {
                  ...ws[addr].s.font,
                  color: { rgb: balance > 0 ? "059669" : "6B7280" },
                  bold: balance > 0,
                },
              };
            }

            // Color for role column (index 3)
            if (c === 3) {
              const role = String(ws[addr].v || "");
              ws[addr].s = {
                ...ws[addr].s,
                font: {
                  ...ws[addr].s.font,
                  color: {
                    rgb: role === "Sekretaris" ? "7C3AED" : "2563EB",
                  },
                  bold: true,
                },
              };
            }
          }
        }
      }

      // Add summary row
      const totalIncome = students.reduce(
        (sum, s) => sum + Number(s.income || 0),
        0
      );
      const totalExpense = students.reduce(
        (sum, s) => sum + Number(s.expense || 0),
        0
      );
      const totalBalance = totalIncome - totalExpense < 0 ? 0 : totalIncome - totalExpense;

      const summaryRow = [
        "",
        "",
        "",
        "",
        "",
        "TOTAL",
        totalIncome,
        totalExpense,
        totalBalance,
        "",
        "",
        "",
      ];

      const summaryStartRow = wsData.length;
      wsData.push(summaryRow);

      // Style summary row
      for (let c = 0; c < summaryRow.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: summaryStartRow, c });
        if (ws[addr]) {
          ws[addr].s = {
            fill: { fgColor: { rgb: "F3F4F6" } },
            font: { bold: true, sz: 10, name: "JetBrains Mono", color: { rgb: "1F2937" } },
            alignment: { horizontal: c === 5 ? "right" : "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "9CA3AF" } },
              bottom: { style: "medium", color: { rgb: "9CA3AF" } },
              left: { style: "thin", color: { rgb: "D1D5DB" } },
              right: { style: "thin", color: { rgb: "D1D5DB" } },
            },
          };
        }
      }

      // Update range
      ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: summaryStartRow, c: header.length - 1 },
      });

      // Buat workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Karyawan");

      // Generate buffer
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="Data_Karyawan_${className}_${new Date().toISOString().split("T")[0]}.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    } finally {
          }
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Gagal mengexport data" },
      { status: 500 }
    );
  }
}