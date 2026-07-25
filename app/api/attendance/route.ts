import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

type AttendanceStatus = "HADIR" | "DISPEN" | "SAKIT" | "IZIN" | "ALPHA";

interface AttendanceRequestBody {
  student_id: string;
  class_id: string;
  status: AttendanceStatus;
  date: string;
}

const PENALTY_MAP: Record<AttendanceStatus, number> = {
  HADIR: 0,
  DISPEN: 1_000_000,
  SAKIT: 2_000_000,
  IZIN: 3_000_000,
  ALPHA: 50_000_000,
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userRole = (session?.user as unknown as Record<string, unknown>)
      ?.role as string | undefined;

    if (
      !session ||
      !userId ||
      !userRole ||
      !["ADMIN", "SECRETARY"].includes(userRole)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: AttendanceRequestBody = await req.json();

    if (!body.student_id || !body.class_id || !body.status || !body.date) {
      return NextResponse.json(
        { error: "Data request tidak lengkap" },
        { status: 400 }
      );
    }

    const penaltyAmount = PENALTY_MAP[body.status] ?? 0;
    const attendanceId = crypto.randomUUID();

    // PostgreSQL: pakai $1, $2, dst
    await query(
      `INSERT INTO attendances (id, student_id, class_id, date, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attendanceId,
        body.student_id,
        body.class_id,
        body.date,
        body.status,
        userId,
      ]
    );

    if (penaltyAmount > 0) {
      await query(
        `UPDATE users SET expense = expense + $1 WHERE id = $2`,
        [penaltyAmount, body.student_id]
      );
    }

    await pusherServer.trigger("arena-global", "data-updated", {
      student_id: body.student_id,
      status: body.status,
    });

    return NextResponse.json({
      success: true,
      message: `Presensi dicatat. Pengeluaran kas +Rp ${penaltyAmount.toLocaleString("id-ID")}`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}