import { NextResponse } from "next/server";
import { buildAccountExport } from "@/lib/account-export";
import { requireUser } from "@/lib/auth";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnreachable } from "@/lib/db-errors";

export async function GET() {
  const user = await requireUser();

  try {
    const bundle = await buildAccountExport(user.id);
    if (!bundle) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const filename = `interviewos-export-${user.id.slice(0, 8)}.json`;
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return NextResponse.json({ error: DATABASE_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    throw error;
  }
}