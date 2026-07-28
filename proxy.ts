import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔥 PUBLIC PATHS - Tidak perlu login
  const publicPaths = ["/login", "/profile"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // 🔥 API routes - izinkan semua (kecuali yang butuh auth khusus)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 🔥 Static files - izinkan
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // 🔥 Pakai auth() langsung, bukan getToken
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // Izinkan akses ke public paths tanpa login
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Jika belum login dan bukan public path, redirect ke login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Jika sudah login dan mencoba membuka halaman /login, redirect sesuai Role
  if (isLoggedIn && pathname === "/login") {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/guru", req.url));
    }
    if (role === "SECRETARY") {
      return NextResponse.redirect(new URL("/sekretaris", req.url));
    }
    return NextResponse.redirect(new URL("/murid", req.url));
  }

  // Proteksi Akses Halaman Berdasarkan Role
  if (isLoggedIn) {
    // Halaman Guru / Admin
    if (pathname.startsWith("/guru") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(getRoleDefaultPath(role), req.url));
    }

    // Halaman Sekretaris
    if (pathname.startsWith("/sekretaris") && role !== "SECRETARY") {
      return NextResponse.redirect(new URL(getRoleDefaultPath(role), req.url));
    }

    // Halaman Murid
    if (pathname.startsWith("/murid") && role !== "STUDENT") {
      return NextResponse.redirect(new URL(getRoleDefaultPath(role), req.url));
    }
  }

  return NextResponse.next();
}

// Helper lokasi halaman default per role
function getRoleDefaultPath(role?: string): string {
  if (role === "ADMIN") return "/guru";
  if (role === "SECRETARY") return "/sekretaris";
  return "/murid";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};