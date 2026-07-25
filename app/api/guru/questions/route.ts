import { NextRequest, NextResponse } from "next/server";
import { query, getRows, getFirstRow, getRowCount } from "@/lib/db";

interface QuestionData {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  level: number;
  usage_count: number;
  created_at: string;
}

interface QuestionRow {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  level: number;
  usage_count: number;
  created_at: string;
}

interface ExistingQuestionRow {
  id: string;
}

// GET - Ambil semua soal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");

    let queryStr = `
      SELECT 
        q.id,
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct,
        q.level,
        COALESCE(COUNT(mq.match_id), 0) as usage_count,
        q.created_at
      FROM questions q
      LEFT JOIN match_questions mq ON q.id = mq.question_id
    `;

    const params: (string | number)[] = [];

    if (level) {
      queryStr += " WHERE q.level = $1";
      params.push(Number(level));
    }

    queryStr += " GROUP BY q.id ORDER BY q.level ASC, q.created_at DESC";

    const result = await query<QuestionRow>(queryStr, params);

    return NextResponse.json(getRows(result));
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data soal" },
      { status: 500 }
    );
  }
}

// POST - Tambah soal baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, option_a, option_b, option_c, option_d, correct, level } =
      body;

    if (
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct ||
      !level
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (!["A", "B", "C", "D"].includes(correct)) {
      return NextResponse.json(
        { error: "Jawaban benar harus A, B, C, atau D" },
        { status: 400 }
      );
    }

    if (Number(level) < 1) {
      return NextResponse.json(
        { error: "Level minimal 1" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

    await query(
      `INSERT INTO questions 
        (id, question, option_a, option_b, option_c, option_d, correct, level) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, question, option_a, option_b, option_c, option_d, correct, Number(level)]
    );

    return NextResponse.json(
      { message: "Soal berhasil ditambahkan", id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan soal" },
      { status: 500 }
    );
  }
}

// PUT - Update soal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, question, option_a, option_b, option_c, option_d, correct, level } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "ID soal wajib diisi" },
        { status: 400 }
      );
    }

    if (
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct ||
      !level
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (!["A", "B", "C", "D"].includes(correct)) {
      return NextResponse.json(
        { error: "Jawaban benar harus A, B, C, atau D" },
        { status: 400 }
      );
    }

    if (Number(level) < 1) {
      return NextResponse.json(
        { error: "Level minimal 1" },
        { status: 400 }
      );
    }

    const existingResult = await query<ExistingQuestionRow>(
      "SELECT id FROM questions WHERE id = $1",
      [id]
    );

    if (getRowCount(existingResult) === 0) {
      return NextResponse.json(
        { error: "Soal tidak ditemukan" },
        { status: 404 }
      );
    }

    await query(
      `UPDATE questions SET 
        question = $1, 
        option_a = $2, 
        option_b = $3, 
        option_c = $4, 
        option_d = $5, 
        correct = $6, 
        level = $7 
      WHERE id = $8`,
      [question, option_a, option_b, option_c, option_d, correct, Number(level), id]
    );

    return NextResponse.json({
      message: "Soal berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui soal" },
      { status: 500 }
    );
  }
}

// DELETE - Hapus soal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID soal wajib diisi" },
        { status: 400 }
      );
    }

    const existingResult = await query<ExistingQuestionRow>(
      "SELECT id FROM questions WHERE id = $1",
      [id]
    );

    if (getRowCount(existingResult) === 0) {
      return NextResponse.json(
        { error: "Soal tidak ditemukan" },
        { status: 404 }
      );
    }

    await query("DELETE FROM questions WHERE id = $1", [id]);

    return NextResponse.json({
      message: "Soal berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Gagal menghapus soal" },
      { status: 500 }
    );
  }
}