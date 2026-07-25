import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

interface CustomToken {
  id?: string;
  role?: "ADMIN" | "SECRETARY" | "STUDENT";
  class_id?: string | null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as CustomToken | null;

  const isLoggedIn = !!token;
  const role = token?.role;

  // 1. Jika belum login dan mencoba akses halaman terproteksi
  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. Jika sudah login dan mencoba membuka halaman /login, redirect sesuai Role
  if (isLoggedIn && pathname === "/login") {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/guru", req.url));
    }
    if (role === "SECRETARY") {
      return NextResponse.redirect(new URL("/sekretaris", req.url));
    }
    return NextResponse.redirect(new URL("/murid", req.url));
  }

  // 3. Proteksi Akses Halaman Berdasarkan Role
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
function getRoleDefaultPath(role?: "ADMIN" | "SECRETARY" | "STUDENT"): string {
  if (role === "ADMIN") return "/guru";
  if (role === "SECRETARY") return "/sekretaris";
  return "/murid";
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};