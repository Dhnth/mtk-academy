import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow, getRows } from "@/lib/db";
import { auth } from "@/auth";

interface StudentRow {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string | null;
}

interface UserRow {
  class_id: string | null;
}

interface UserBalanceRow {
  income: number;
  expense: number;
}

interface ExistingAttendanceRow {
  status: string;
}

interface AttendanceIdRow {
  id: string;
}

// GET - Ambil data siswa dengan status absensi hari ini (termasuk sekretaris)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Get user's class_id
    const userResult = await query<UserRow>(
      "SELECT class_id FROM users WHERE id = $1",
      [userId]
    );

    const user = getFirstRow(userResult);

    if (!user || !user.class_id) {
      return NextResponse.json([], { status: 200 });
    }

    const classId = user.class_id;

    // Get all users in class with their attendance status for the date
    const studentsResult = await query<StudentRow>(
      `SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        a.status
      FROM users u
      LEFT JOIN attendances a 
        ON a.student_id = u.id 
        AND a.date = $1
      WHERE u.class_id = $2 AND u.role IN ('STUDENT', 'SECRETARY')
      ORDER BY u.role DESC, u.name ASC`,
      [date, classId]
    );

    return NextResponse.json(getRows(studentsResult));
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data absensi" },
      { status: 500 }
    );
  }
}

// POST - Simpan absensi (insert/update) dengan pengurangan saldo otomatis
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { date, status } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Tanggal wajib diisi" },
        { status: 400 }
      );
    }

    if (!status || typeof status !== "object" || Object.keys(status).length === 0) {
      return NextResponse.json(
        { error: "Data status absensi tidak lengkap" },
        { status: 400 }
      );
    }

    // Map status to deduction amount
    const deductionMap: Record<string, number> = {
      "SAKIT": 2000000,    // 2jt
      "DIS PEN": 1000000,  // 1jt
      "IZIN": 3000000,     // 3jt
      "ALPHA": 50000000,   // 50jt
      "HADIR": 0,          // Tidak ada pengurangan
    };

    // Get user's class_id
    const userResult = await query<UserRow>(
      "SELECT class_id FROM users WHERE id = $1",
      [userId]
    );

    const user = getFirstRow(userResult);

    if (!user || !user.class_id) {
      return NextResponse.json(
        { error: "User tidak memiliki kelas" },
        { status: 400 }
      );
    }

    const classId = user.class_id;
    const validStatuses = ["HADIR", "IZIN", "SAKIT", "ALPHA", "DIS PEN"];

    let successCount = 0;
    let errorCount = 0;
    let totalDeduction = 0;
    let totalRefund = 0;

    for (const [studentId, studentStatus] of Object.entries(status)) {
      if (!studentId) {
        errorCount++;
        continue;
      }

      const statusStr = String(studentStatus).toUpperCase();
      if (!validStatuses.includes(statusStr)) {
        errorCount++;
        continue;
      }

      // Get current user data
      const userDataResult = await query<UserBalanceRow>(
        "SELECT income, expense FROM users WHERE id = $1",
        [studentId]
      );

      const userData = getFirstRow(userDataResult);
      if (!userData) {
        errorCount++;
        continue;
      }

      const currentIncome = Number(userData.income || 0);
      const currentExpense = Number(userData.expense || 0);
      const currentBalance = currentIncome - currentExpense;

      // Cek status absensi sebelumnya untuk hari ini
      const existingAttendanceResult = await query<ExistingAttendanceRow>(
        "SELECT status FROM attendances WHERE student_id = $1 AND date = $2",
        [studentId, date]
      );

      const existingAttendance = getFirstRow(existingAttendanceResult);
      const oldStatus = existingAttendance ? existingAttendance.status : null;
      const newDeduction = deductionMap[statusStr] || 0;
      const oldDeduction = oldStatus ? (deductionMap[oldStatus] || 0) : 0;

      let newIncome = currentIncome;
      let newExpense = currentExpense;

      // HANYA PROSES jika status berubah
      if (oldStatus !== statusStr) {
        const deductionDifference = newDeduction - oldDeduction;

        if (deductionDifference > 0) {
          // Ada potongan tambahan (dari status yang lebih rendah ke lebih tinggi)
          if (currentBalance >= deductionDifference) {
            // Jika saldo cukup, kurangi income
            newIncome = currentIncome - deductionDifference;
          } else {
            // Jika saldo tidak cukup
            newIncome = 0;
            const remaining = deductionDifference - currentBalance;
            newExpense = currentExpense + remaining;
          }
          totalDeduction += deductionDifference;
        } else if (deductionDifference < 0) {
          // Ada pengembalian (dari status yang lebih tinggi ke lebih rendah)
          const refundAmount = Math.abs(deductionDifference);
          
          // Kembalikan ke income (kurangi expense atau tambah income)
          if (currentExpense >= refundAmount) {
            // Kurangi expense dulu
            newExpense = currentExpense - refundAmount;
          } else {
            // Habiskan expense, sisanya tambah ke income
            const remainingRefund = refundAmount - currentExpense;
            newExpense = 0;
            newIncome = currentIncome + remainingRefund;
          }
          totalRefund += refundAmount;
        }

        // Update user balance jika ada perubahan
        if (newIncome !== currentIncome || newExpense !== currentExpense) {
          await query(
            "UPDATE users SET income = $1, expense = $2 WHERE id = $3",
            [newIncome, newExpense, studentId]
          );
        }
      }

      // Update atau insert attendance (tetap dilakukan meskipun status sama)
      const attendanceCheckResult = await query<AttendanceIdRow>(
        "SELECT id FROM attendances WHERE student_id = $1 AND date = $2",
        [studentId, date]
      );

      const existingAttendanceRow = getFirstRow(attendanceCheckResult);

      if (existingAttendanceRow) {
        // Update existing
        await query(
          "UPDATE attendances SET status = $1 WHERE student_id = $2 AND date = $3",
          [statusStr, studentId, date]
        );
      } else {
        // Insert new
        const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        await query(
          "INSERT INTO attendances (id, student_id, class_id, date, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, studentId, classId, date, statusStr, userId]
        );
      }
      successCount++;
    }

    let message = `Berhasil menyimpan ${successCount} data absensi`;
    if (totalDeduction > 0) {
      message += `. Total potongan: ${formatCurrency(totalDeduction)}`;
    }
    if (totalRefund > 0) {
      message += `. Total pengembalian: ${formatCurrency(totalRefund)}`;
    }

    return NextResponse.json({
      message: message,
      success: successCount,
      errors: errorCount,
      totalDeduction: totalDeduction,
      totalRefund: totalRefund,
    });
  } catch (error) {
    console.error("Error saving attendance:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan absensi" },
      { status: 500 }
    );
  }
}

// Helper function untuk format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}