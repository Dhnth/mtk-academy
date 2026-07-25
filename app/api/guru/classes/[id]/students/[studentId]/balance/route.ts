import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";

interface StudentBalanceRow {
  id: string;
  income: number;
  expense: number;
}

// PATCH - Tambah atau kurangi saldo siswa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;
    const body = await request.json();
    const { amount, type } = body;

    if (!id || !studentId) {
      return NextResponse.json(
        { error: "ID kelas dan ID siswa wajib diisi" },
        { status: 400 }
      );
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka positif" },
        { status: 400 }
      );
    }

    if (!type || !["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { error: "Type harus INCOME atau EXPENSE" },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    // Cek apakah siswa ada di kelas ini
    const studentResult = await query<StudentBalanceRow>(
      "SELECT id, income, expense FROM users WHERE id = $1 AND class_id = $2",
      [studentId, id]
    );

    const student = getFirstRow(studentResult);

    if (!student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan di kelas ini" },
        { status: 404 }
      );
    }

    const currentIncome = Number(student.income || 0);
    const currentExpense = Number(student.expense || 0);
    const currentBalance = currentIncome - currentExpense;

    let newIncome = currentIncome;
    let newExpense = currentExpense;

    if (type === "EXPENSE") {
      // KURANGI SALDO: Gunakan income dulu, sisanya ke expense
      if (currentBalance >= numericAmount) {
        newIncome = currentIncome - numericAmount;
      } else {
        newIncome = 0;
        const remaining = numericAmount - currentBalance;
        newExpense = currentExpense + remaining;
      }
    } else {
      // TAMBAH SALDO (INCOME): Kurangi expense dulu, sisanya ke income
      if (currentExpense > 0) {
        if (currentExpense >= numericAmount) {
          newExpense = currentExpense - numericAmount;
          newIncome = currentIncome;
        } else {
          const remaining = numericAmount - currentExpense;
          newExpense = 0;
          newIncome = currentIncome + remaining;
        }
      } else {
        newIncome = currentIncome + numericAmount;
      }
    }

    await query(
      "UPDATE users SET income = $1, expense = $2 WHERE id = $3",
      [newIncome, newExpense, studentId]
    );

    const newBalance = newIncome - newExpense;

    return NextResponse.json({
      message: `Saldo berhasil ${type === "INCOME" ? "ditambahkan" : "dikurangi"}`,
      data: {
        income: newIncome,
        expense: newExpense,
        balance: newBalance < 0 ? 0 : newBalance,
      },
    });
  } catch (error) {
    console.error("Error updating balance:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui saldo" },
      { status: 500 }
    );
  }
}