import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { homeFor, rolesForPath } from "@/lib/roles";

// Next 16: pengganti middleware.js. Hanya pemeriksaan cepat (optimistic) berbasis
// cookie; setiap route API tetap memeriksa sesi & peran sendiri lewat requireUser().
export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/masuk") {
    return user ? NextResponse.redirect(new URL(homeFor(user.role), request.url)) : NextResponse.next();
  }

  const allowed = rolesForPath(pathname);
  if (!allowed) return NextResponse.next();

  if (!user) {
    const login = new URL("/masuk", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (!allowed.includes(user.role)) {
    return NextResponse.redirect(new URL(homeFor(user.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/masuk", "/kerja/:path*", "/pantau/:path*", "/admin/:path*"],
};
