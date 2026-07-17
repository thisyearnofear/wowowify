import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDeploymentMode, isAspAllowedPath } from "@/lib/deployment";

export function middleware(request: NextRequest) {
  const mode = getDeploymentMode();
  if (mode !== "asp") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/fonts/")
  ) {
    return NextResponse.next();
  }

  if (!isAspAllowedPath(pathname)) {
    return NextResponse.json(
      {
        error: "This deployment runs in ASP mode and exposes API routes only.",
        mode: "asp",
      },
      { status: 404 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
