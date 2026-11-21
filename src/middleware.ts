import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isIndexNowKeyRequest } from "@/lib/indexnow";

/** Serves `/{INDEXNOW_KEY}.txt` without a committed secret file in `public/`. */
export function middleware(request: NextRequest) {
  if (isIndexNowKeyRequest(request.nextUrl.pathname)) {
    const key = process.env.INDEXNOW_KEY!.trim();
    return new NextResponse(key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:segment(.*\\.txt)"],
};