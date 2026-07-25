import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface TeamMemberRow {
  team_id: string;
}

interface TeamRow {
  captain_id: string;
}

interface CountRow {
  count: number;
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

    try {
      // Cek apakah user di tim
      const teamMemberResult = await query<TeamMemberRow>(
        "SELECT team_id FROM team_members WHERE user_id = $1",
        [userId]
      );

      const teamMember = getFirstRow(teamMemberResult);

      if (!teamMember) {
        return NextResponse.json(
          { error: "Anda tidak berada di tim manapun" },
          { status: 400 }
        );
      }

      const teamId = teamMember.team_id;

      // Cek apakah user adalah captain
      const teamResult = await query<TeamRow>(
        "SELECT captain_id FROM teams WHERE id = $1",
        [teamId]
      );

      const team = getFirstRow(teamResult);

      if (!team) {
        return NextResponse.json(
          { error: "Tim tidak ditemukan" },
          { status: 404 }
        );
      }

      if (team.captain_id === userId) {
        return NextResponse.json(
          { error: "Kapten tidak dapat keluar. Gunakan fitur bubarkan tim." },
          { status: 400 }
        );
      }

      // Hapus dari tim
      await query(
        "DELETE FROM team_members WHERE user_id = $1 AND team_id = $2",
        [userId, teamId]
      );

      // Update status tim jika full
      const remainingResult = await query<CountRow>(
        "SELECT COUNT(*) as count FROM team_members WHERE team_id = $1",
        [teamId]
      );

      const remaining = getFirstRow(remainingResult);
      const count = Number(remaining?.count || 0);

      if (count < 4) {
        await query(
          "UPDATE teams SET status = 'WAITING' WHERE id = $1",
          [teamId]
        );
      }

      // Trigger Pusher event
      await pusherServer.trigger(`team-${teamId}`, "team-update", { teamId });

      return NextResponse.json({
        message: "Berhasil keluar dari tim",
      });
    } catch (error) {
      console.error("Error leaving team:", error);
      return NextResponse.json(
        { error: "Gagal keluar dari tim" },
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