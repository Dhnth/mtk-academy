import { NextRequest, NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";

interface TeamMemberRow {
  team_id: string;
  captain_id: string;
}

interface CountRow {
  count: number;
}

// POST - Batalkan antrian team battle
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
      // Cek apakah user berada di tim dan merupakan kapten
      const teamMembersResult = await query<TeamMemberRow>(
        `SELECT tm.team_id, t.captain_id 
         FROM team_members tm 
         JOIN teams t ON tm.team_id = t.id 
         WHERE tm.user_id = $1`,
        [userId]
      );

      const teamMember = getFirstRow(teamMembersResult);

      if (!teamMember) {
        return NextResponse.json(
          { error: "Anda tidak berada dalam tim manapun" },
          { status: 400 }
        );
      }

      const { team_id: teamId, captain_id: captainId } = teamMember;

      if (captainId !== userId) {
        return NextResponse.json(
          { error: "Hanya kapten tim yang dapat membatalkan matchmaking" },
          { status: 403 }
        );
      }

      // Hapus tim dari queue
      await query(
        "DELETE FROM team_queue WHERE team_id = $1",
        [teamId]
      );

      // Hitung jumlah anggota untuk update status
      const membersCountResult = await query<CountRow>(
        "SELECT COUNT(*) as count FROM team_members WHERE team_id = $1",
        [teamId]
      );

      const membersCount = getFirstRow(membersCountResult);
      const count = Number(membersCount?.count || 0);
      const newStatus = count >= 4 ? "FULL" : "WAITING";

      // Update status tim
      await query(
        "UPDATE teams SET status = $1 WHERE id = $2",
        [newStatus, teamId]
      );

      // Trigger event matchmaking cancelled ke anggota tim
      await pusherServer.trigger(`team-${teamId}`, "matchmaking-cancelled", { teamId });

      return NextResponse.json({
        message: "Matchmaking dibatalkan",
        teamId,
      });
    } catch (error) {
      console.error("Error in team queue cancel:", error);
      return NextResponse.json(
        { error: "Gagal membatalkan matchmaking" },
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