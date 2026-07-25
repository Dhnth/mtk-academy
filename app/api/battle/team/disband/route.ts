import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface TeamMemberRow {
  team_id: string;
}

interface TeamRow {
  captain_id: string;
  status: string;
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
        "SELECT captain_id, status FROM teams WHERE id = $1",
        [teamId]
      );

      const team = getFirstRow(teamResult);

      if (!team) {
        return NextResponse.json(
          { error: "Tim tidak ditemukan" },
          { status: 404 }
        );
      }

      if (team.captain_id !== userId) {
        return NextResponse.json(
          { error: "Hanya kapten yang dapat membubarkan tim" },
          { status: 403 }
        );
      }

      // Kirim event ke semua anggota tim sebelum menghapus
      await pusherServer.trigger(`team-${teamId}`, "team-disband", {
        teamId,
        message: "Tim telah dibubarkan oleh kapten",
      });

      // Hapus semua anggota
      await query(
        "DELETE FROM team_members WHERE team_id = $1",
        [teamId]
      );

      // Hapus tim
      await query(
        "DELETE FROM teams WHERE id = $1",
        [teamId]
      );

      return NextResponse.json({
        message: "Tim berhasil dibubarkan",
      });
    } catch (error) {
      console.error("Error disbanding team:", error);
      return NextResponse.json(
        { error: "Gagal membubarkan tim" },
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