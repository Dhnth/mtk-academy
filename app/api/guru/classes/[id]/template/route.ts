import { NextRequest, NextResponse } from "next/server";
import XLSX from "xlsx-js-style";

// GET - Download template import
export async function GET() {
  try {
    const headers = ["Nama Lengkap", "Username", "Password", "Role"];
    const sampleData = [
      ["Andi Wijaya", "andi_12", "rahasia123", "Siswa"],
      ["Budi Santoso", "budi_12", "rahasia456", "Sekretaris"],
    ];

    const wsData = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header
    const headerStyle = {
      fill: { fgColor: { rgb: "2563EB" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "JetBrains Mono" },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "1E40AF" } },
        bottom: { style: "thin", color: { rgb: "1E40AF" } },
        left: { style: "thin", color: { rgb: "1E40AF" } },
        right: { style: "thin", color: { rgb: "1E40AF" } },
      },
    };

    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) {
        ws[addr].s = headerStyle;
      }
    }

    // Set column widths
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    // Tambah note di bawah
    const noteRow = [
      "Catatan: Role hanya boleh diisi 'Siswa' atau 'Sekretaris'",
      "",
      "",
      "",
    ];
    const noteStartRow = wsData.length;
    wsData.push(...noteRow.map((r) => [r]));

    // Style note
    for (let c = 0; c < 1; c++) {
      const addr = XLSX.utils.encode_cell({ r: noteStartRow, c });
      if (ws[addr]) {
        ws[addr].s = {
          font: { italic: true, color: { rgb: "6B7280" }, sz: 10 },
          alignment: { horizontal: "left" },
        };
      }
    }

    // Update range
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: noteStartRow, c: headers.length - 1 },
    });

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Template_Import_Karyawan.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Gagal membuat template" },
      { status: 500 }
    );
  }
}