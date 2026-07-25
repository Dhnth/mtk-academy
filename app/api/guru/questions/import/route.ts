import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import XLSX from "xlsx-js-style";

// POST - Import soal dari Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File Excel wajib diupload" },
        { status: 400 }
      );
    }

    // Validasi ekstensi file
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(fileExtension || "")) {
      return NextResponse.json(
        { error: "Format file harus .xlsx atau .xls" },
        { status: 400 }
      );
    }

    // Read file - gunakan raw: true untuk mendapatkan nilai asli
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON dengan raw: true agar nilai tidak diformat
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: "",
      raw: true 
    });

    if (data.length === 0) {
      return NextResponse.json(
        { error: "File kosong atau tidak ada data" },
        { status: 400 }
      );
    }

    // Get headers from first row
    const firstRow = data[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow);

    // Expected headers
    const expectedHeaders = [
      "Pertanyaan",
      "Opsi A",
      "Opsi B",
      "Opsi C",
      "Opsi D",
      "Jawaban Benar",
      "Level",
    ];

    // Check if headers match (case insensitive)
    const normalizedHeaders = headers.map(h => h.trim());
    const isValid = expectedHeaders.every((h) =>
      normalizedHeaders.some((header) => header === h)
    );

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            `Format file tidak sesuai. Gunakan kolom: ${expectedHeaders.join(", ")}. ` +
            `Headers yang ditemukan: ${headers.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Proses import
    const results = {
      success: 0,
      failed: [] as { row: number; reason: string }[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, unknown>;
      const rowNumber = i + 2;

      try {
        // Fungsi untuk konversi value ke string dengan tetap mempertahankan format
        const toString = (value: unknown): string => {
          if (value === null || value === undefined) return "";
          if (typeof value === "string") return value.trim();
          if (typeof value === "number") {
            if (Number.isInteger(value)) {
              return value.toString();
            }
            return value.toString().replace(".", ",");
          }
          if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
          return String(value).trim();
        };

        // Konversi dengan fungsi toString
        const question = toString(row["Pertanyaan"]);
        const optionA = toString(row["Opsi A"]);
        const optionB = toString(row["Opsi B"]);
        const optionC = toString(row["Opsi C"]);
        const optionD = toString(row["Opsi D"]);
        const correct = toString(row["Jawaban Benar"]).toUpperCase();
        
        // Level - bisa number atau string
        let level = 1;
        const levelValue = row["Level"];
        if (typeof levelValue === "number") {
          level = levelValue;
        } else if (typeof levelValue === "string") {
          level = parseInt(levelValue, 10) || 1;
        } else {
          level = Number(levelValue) || 1;
        }

        // Validasi
        if (!question) {
          results.failed.push({ row: rowNumber, reason: "Pertanyaan kosong" });
          continue;
        }

        if (!optionA || !optionB || !optionC || !optionD) {
          results.failed.push({ row: rowNumber, reason: "Opsi tidak lengkap" });
          continue;
        }

        if (!["A", "B", "C", "D"].includes(correct)) {
          results.failed.push({
            row: rowNumber,
            reason: `Jawaban benar harus A, B, C, atau D (diterima: "${correct}")`,
          });
          continue;
        }

        if (isNaN(level) || level < 1) {
          results.failed.push({
            row: rowNumber,
            reason: `Level harus angka >= 1 (diterima: "${levelValue}")`,
          });
          continue;
        }

        const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

        await query(
          `INSERT INTO questions 
            (id, question, option_a, option_b, option_c, option_d, correct, level) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, question, optionA, optionB, optionC, optionD, correct, level]
        );

        results.success++;
      } catch (err) {
        console.error(`Error importing row ${rowNumber}:`, err);
        results.failed.push({
          row: rowNumber,
          reason: err instanceof Error ? err.message : "Error server",
        });
      }
    }

    return NextResponse.json({
      message: `Berhasil import ${results.success} soal`,
      results,
    });
  } catch (error) {
    console.error("Error importing questions:", error);
    return NextResponse.json(
      { error: "Gagal mengimport data" },
      { status: 500 }
    );
  }
}