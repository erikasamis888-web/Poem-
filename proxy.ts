import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminToken, isAdminConfigured } from "@/lib/admin-token";

// Keeps the public out of /admin: without the login cookie, send them to /login.
export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (isAdminConfigured() && cookie === (await adminToken())) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
