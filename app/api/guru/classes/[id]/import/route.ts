import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRowCount } from "@/lib/db";
import bcrypt from "bcryptjs";
import XLSX from "xlsx-js-style";

interface ClassRow {
  id: string;
  name: string;
}

interface ExistingUserRow {
  id: string;
}

// POST - Import siswa dari Excel
export async function POST(
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

    // Cek apakah kelas exist
    const classResult = await query<ClassRow>(
      "SELECT id, name FROM classes WHERE id = $1",
      [id]
    );

    if (getRowCount(classResult) === 0) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "File kosong atau tidak ada data" },
        { status: 400 }
      );
    }

    // Mapping columns
    const expectedHeaders = [
      "Nama Lengkap",
      "Username",
      "Password",
      "Role",
    ];

    const firstRow = data[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow);

    const isValid = expectedHeaders.every((h) =>
      headers.some((header) => header.trim() === h)
    );

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            "Format file tidak sesuai. Gunakan kolom: Nama Lengkap, Username, Password, Role",
        },
        { status: 400 }
      );
    }

    // Proses import
    const results = {
      success: [] as string[],
      failed: [] as { row: number; reason: string }[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, string>;
      const rowNumber = i + 2;

      try {
        const name = row["Nama Lengkap"]?.trim();
        const username = row["Username"]?.trim();
        const password = row["Password"]?.trim();
        const role = row["Role"]?.trim() || "Siswa";

        // Validasi
        if (!name) {
          results.failed.push({ row: rowNumber, reason: "Nama kosong" });
          continue;
        }

        if (!username || username.length < 3) {
          results.failed.push({
            row: rowNumber,
            reason: "Username minimal 3 karakter",
          });
          continue;
        }

        if (!password || password.length < 4) {
          results.failed.push({
            row: rowNumber,
            reason: "Password minimal 4 karakter",
          });
          continue;
        }

        // Cek username duplikat
        const existingResult = await query<ExistingUserRow>(
          "SELECT id FROM users WHERE username = $1",
          [username]
        );

        if (getRowCount(existingResult) > 0) {
          results.failed.push({
            row: rowNumber,
            reason: `Username "${username}" sudah digunakan`,
          });
          continue;
        }

        const roleEnum = role.toLowerCase() === "sekretaris" ? "SECRETARY" : "STUDENT";

        const userId = crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();
        const hashedPassword = await bcrypt.hash(password, 10);

        await query(
          `INSERT INTO users 
            (id, username, password, name, role, class_id, level, exp, income, expense, wins, losses) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            userId,
            username,
            hashedPassword,
            name,
            roleEnum,
            id,
            1,
            0,
            0,
            0,
            0,
            0,
          ]
        );

        results.success.push(username);
      } catch (err) {
        console.error(`Error importing row ${rowNumber}:`, err);
        results.failed.push({
          row: rowNumber,
          reason: "Error server",
        });
      }
    }

    return NextResponse.json({
      message: `Berhasil import ${results.success.length} siswa`,
      results,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Gagal mengimport data" },
      { status: 500 }
    );
  }
}