import { NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

interface TeamMemberRow {
  team_id: string;
}

interface TeamRow {
  id: string;
  code: string;
  name: string;
  captain_id: string;
  class_id: string;
  status: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  user_name: string;
  user_username: string;
  joined_at: string;
}

interface ActiveMatchRow {
  id: string;
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

    try {
      // Cek apakah user ada di tim
      const teamMemberResult = await query<TeamMemberRow>(
        `SELECT team_id FROM team_members WHERE user_id = $1`,
        [userId]
      );

      const teamMember = getFirstRow(teamMemberResult);

      if (!teamMember) {
        return NextResponse.json(null, { status: 200 });
      }

      const teamId = teamMember.team_id;

      // Ambil data tim
      const teamsResult = await query<TeamRow>(
        `SELECT 
          t.id,
          t.code,
          t.name,
          t.captain_id,
          t.class_id,
          t.status,
          t.created_at
        FROM teams t
        WHERE t.id = $1`,
        [teamId]
      );

      const team = getFirstRow(teamsResult);

      if (!team) {
        return NextResponse.json(null, { status: 200 });
      }

      // Ambil anggota tim
      const membersResult = await query<MemberRow>(
        `SELECT 
          tm.id,
          tm.user_id,
          tm.joined_at,
          u.name as user_name,
          u.username as user_username
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC`,
        [teamId]
      );

      // Cek apakah ada match aktif untuk tim ini
      let activeMatchId: string | null = null;
      
      // Cek apakah tim sedang IN_BATTLE
      if (team.status === "IN_BATTLE") {
        const activeMatchResult = await query<ActiveMatchRow>(
          `SELECT id FROM matches 
           WHERE (player1_id = $1 OR player2_id = $1) 
           AND status IN ('PENDING', 'ONGOING')
           ORDER BY created_at DESC 
           LIMIT 1`,
          [teamId]
        );
        
        const activeMatch = getFirstRow(activeMatchResult);
        if (activeMatch) {
          activeMatchId = activeMatch.id;
        }
      }

      return NextResponse.json({
        id: team.id,
        code: team.code,
        name: team.name,
        captain_id: team.captain_id,
        class_id: team.class_id,
        status: team.status,
        active_match_id: activeMatchId,
        members: membersResult.rows.map((m: MemberRow) => ({
          id: m.id,
          user_id: m.user_id,
          user_name: m.user_name,
          user_username: m.user_username,
          joined_at: m.joined_at,
        })),
        created_at: team.created_at,
      });
    } catch (error) {
      console.error("Error fetching team:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data tim" },
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