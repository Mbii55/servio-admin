// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("servio_admin_token")?.value;
  const pathname = req.nextUrl.pathname;

  const isLoginPage = pathname === "/";
  const isAdminRoute = pathname.startsWith("/admin");

  // If user tries to access admin routes without token, redirect to login
  if (isAdminRoute && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If user is already logged in and tries to access login page, redirect to admin
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};