import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { homeFor, PASSWORD_PATH, rolesForPath } from "@/lib/roles";

// Next 16: pengganti middleware.js. Hanya pemeriksaan cepat (optimistic) berbasis
// cookie; setiap route API tetap memeriksa sesi & peran sendiri lewat requireUser().
// /masuk sengaja tidak dialihkan di sini: proxy tidak bisa melihat DB, jadi token akun
// yang sudah dinonaktifkan masih tampak sah dan akan memantul /masuk ↔ /kerja.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const allowed = rolesForPath(pathname);
  if (!allowed) return NextResponse.next();

  if (!user) {
    const login = new URL("/masuk", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (user.mustChangePassword && pathname !== PASSWORD_PATH) {
    return NextResponse.redirect(new URL(PASSWORD_PATH, request.url));
  }
  if (!allowed.includes(user.role)) {
    return NextResponse.redirect(new URL(homeFor(user.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/akun/:path*", "/kerja/:path*", "/pantau/:path*", "/admin/:path*"],
};
