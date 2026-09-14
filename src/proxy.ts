import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge auth gate (Next 16 proxy convention).
 *
 * Optimistic check only: the session cookie's PRESENCE gates navigation, so
 * logged-out users bounce to /login before any server render or DB query.
 * The authoritative check stays in `requireUser` (JWT verify + DB lookup).
 *
 * Benefits: protected routes stop paying a full server render + redirect on
 * every logged-out hit, and logged-in users never flash the login/signup
 * screens when deep-linking to them.
 */

const SESSION_COOKIE = "ip_session";

/** Paths that need a session (page navigations only; APIs guard themselves). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/interviews",
  "/history",
  "/settings",
  "/faq",
  "/mock",
];

/** Auth pages a logged-in user has no business seeing. */
const AUTH_PAGES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!hasSession) {
      const login = new URL("/login", request.url);
      // Return the user to where they were headed after they authenticate.
      if (pathname !== "/dashboard") {
        login.searchParams.set("next", `${pathname}${search}`);
      }
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pages only — API routes do their own authenticated 401s, and static
  // assets/images never need the gate.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.*|robots.txt|sitemap.xml|manifest.*).*)",
  ],
};
