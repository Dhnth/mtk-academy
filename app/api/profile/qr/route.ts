import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username required" },
        { status: 400 }
      );
    }

    // Generate URL untuk profile publik
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mtk-academy.vercel.app/";
    const profileUrl = `${baseUrl}/profile/${username}`;

    // Generate QR Code sebagai buffer
    const qrBuffer = await QRCode.toBuffer(profileUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    // Convert buffer ke Uint8Array untuk response
    const uint8Array = new Uint8Array(qrBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${username}.png"`,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}