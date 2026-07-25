import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface ExistingTeamRow {
  team_id: string;
}

interface TeamRow {
  id: string;
  captain_id: string;
  class_id: string;
  status: string;
  member_count: number;
}

interface UserClassRow {
  class_id: string | null;
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
    const { code } = body;

    if (!code || code.trim() === "") {
      return NextResponse.json(
        { error: "Kode tim wajib diisi" },
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

      // Cari tim dengan kode tersebut
      const teamsResult = await query<TeamRow>(
        `SELECT 
          t.id,
          t.captain_id,
          t.class_id,
          t.status,
          COUNT(tm.id) as member_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.code = $1
        GROUP BY t.id, t.captain_id, t.class_id, t.status`,
        [code.trim().toUpperCase()]
      );

      const team = getFirstRow(teamsResult);

      if (!team) {
        return NextResponse.json(
          { error: "Kode tim tidak ditemukan" },
          { status: 404 }
        );
      }

      // Cek status tim
      if (team.status !== "WAITING" && team.status !== "FULL") {
        return NextResponse.json(
          { error: "Tim sudah dalam pertandingan atau tidak tersedia" },
          { status: 400 }
        );
      }

      // Cek apakah tim penuh (max 4)
      if (Number(team.member_count) >= 4) {
        return NextResponse.json(
          { error: "Tim sudah penuh (4/4)" },
          { status: 400 }
        );
      }

      // Cek apakah user satu class dengan tim
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

      if (userData.class_id !== team.class_id) {
        return NextResponse.json(
          { error: "Anda tidak dapat bergabung ke tim dari PT lain" },
          { status: 400 }
        );
      }

      // Gabung ke tim
      const memberId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await query(
        `INSERT INTO team_members (id, team_id, user_id) VALUES ($1, $2, $3)`,
        [memberId, team.id, userId]
      );

      // Jika sudah 4 orang, update status tim menjadi FULL
      const newMemberCount = Number(team.member_count) + 1;
      if (newMemberCount >= 4) {
        await query(
          "UPDATE teams SET status = 'FULL' WHERE id = $1",
          [team.id]
        );
      }

      // Trigger Pusher event
      await pusherServer.trigger(`team-${team.id}`, "team-update", { teamId: team.id });

      return NextResponse.json({
        message: "Berhasil bergabung ke tim",
        teamId: team.id,
      });
    } catch (error) {
      console.error("Error joining team:", error);
      return NextResponse.json(
        { error: "Gagal bergabung ke tim" },
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