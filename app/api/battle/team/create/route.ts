import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

function generateTeamCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface ExistingTeamRow {
  team_id: string;
}

interface UserClassRow {
  class_id: string | null;
}

interface CodeExistsRow {
  id: string;
}

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
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Nama tim wajib diisi" },
        { status: 400 }
      );
    }

    try {
      // Cek apakah user sudah di tim lain
      const existingResult = await query<ExistingTeamRow>(
        "SELECT team_id FROM team_members WHERE user_id = $1",
        [userId]
      );

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Anda sudah berada di tim lain" },
          { status: 400 }
        );
      }

      // Dapatkan class_id user
      const userResult = await query<UserClassRow>(
        "SELECT class_id FROM users WHERE id = $1",
        [userId]
      );

      const userData = getFirstRow(userResult);

      if (!userData) {
        return NextResponse.json(
          { error: "User tidak ditemukan" },
          { status: 404 }
        );
      }

      const classId = userData.class_id;

      if (!classId) {
        return NextResponse.json(
          { error: "Anda belum memiliki PT. Silakan hubungi admin." },
          { status: 400 }
        );
      }

      // Generate unique code
      let code = generateTeamCode();
      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        const codeResult = await query<CodeExistsRow>(
          "SELECT id FROM teams WHERE code = $1",
          [code]
        );
        if (codeResult.rows.length === 0) {
          codeExists = false;
        } else {
          code = generateTeamCode();
          attempts++;
        }
      }

      if (codeExists) {
        return NextResponse.json(
          { error: "Gagal generate kode tim. Silakan coba lagi." },
          { status: 500 }
        );
      }

      const teamId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

      // Buat tim
      await query(
        `INSERT INTO teams (id, code, name, captain_id, class_id, status) 
         VALUES ($1, $2, $3, $4, $5, 'WAITING')`,
        [teamId, code, name.trim(), userId, classId]
      );

      // Tambahkan captain sebagai anggota
      const memberId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await query(
        `INSERT INTO team_members (id, team_id, user_id) VALUES ($1, $2, $3)`,
        [memberId, teamId, userId]
      );

      // Trigger Pusher event
      try {
        await pusherServer.trigger(`team-${teamId}`, "team-update", { teamId });
      } catch (e) {
        console.error("Failed to trigger pusher for team create", e);
      }

      return NextResponse.json({
        message: "Tim berhasil dibuat",
        teamId,
        code,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      return NextResponse.json(
        { error: "Gagal membuat tim" },
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