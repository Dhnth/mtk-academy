import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";

// POST - Batalkan antrian solo
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    try {
      // Hapus user dari queue
      await query(
        "DELETE FROM solo_queue WHERE user_id = $1",
        [userId]
      );

      return NextResponse.json({
        message: "Pencarian dibatalkan",
        userId,
      });
    } catch (error) {
      console.error("Error in solo queue cancel:", error);
      return NextResponse.json(
        { error: "Gagal membatalkan pencarian" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}