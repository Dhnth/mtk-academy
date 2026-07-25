import { NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface UserRow {
  class_id: string | null;
}

interface ClassRow {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const userResult = await query<UserRow>(
      "SELECT class_id FROM users WHERE id = $1",
      [userId]
    );

    const user = getFirstRow(userResult);

    if (!user || !user.class_id) {
      return NextResponse.json(
        { error: "User tidak memiliki kelas" },
        { status: 404 }
      );
    }

    const classId = user.class_id;

    const classResult = await query<ClassRow>(
      "SELECT id, name FROM classes WHERE id = $1",
      [classId]
    );

    const classData = getFirstRow(classResult);

    if (!classData) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: classData.id,
      name: classData.name,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kelas" },
      { status: 500 }
    );
  }
}