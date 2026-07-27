import { NextResponse } from "next/server";
import { query, getFirstRow } from "@/lib/db";
import { auth } from "@/auth";

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

    // Get current user data
    const userResult = await query(
      "SELECT level, exp FROM users WHERE id = $1",
      [userId]
    );

    const user = getFirstRow(userResult) as { level: number; exp: number } | null;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const currentLevel = Number(user.level || 1);
    const currentExp = Number(user.exp || 0);
    let levelUp = false;
    let newLevel = currentLevel;
    let newExp = currentExp;

    // Level N → Level N+1: Butuh (Level N * 100) EXP
    let expNeeded = currentLevel * 100;
    let canLevelUp = currentExp >= expNeeded;

    // Loop untuk multiple level up
    while (canLevelUp) {
      newExp = newExp - expNeeded;
      newLevel = newLevel + 1;
      levelUp = true;
      
      expNeeded = newLevel * 100;
      canLevelUp = newExp >= expNeeded;
    }

    if (!levelUp) {
      return NextResponse.json({
        message: "EXP belum cukup untuk naik level",
        level: currentLevel,
        exp: currentExp,
        neededExp: currentLevel * 100,
        leveledUp: false,
      });
    }

    // Update level dan exp
    await query(
      "UPDATE users SET level = $1, exp = $2 WHERE id = $3",
      [newLevel, newExp, userId]
    );

    return NextResponse.json({
      message: `Level berhasil naik ke ${newLevel}!`,
      level: newLevel,
      exp: newExp,
      oldLevel: currentLevel,
      leveledUp: true,
    });
  } catch (error) {
    console.error("Error updating level:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui level" },
      { status: 500 }
    );
  }
}