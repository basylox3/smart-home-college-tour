import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { authorized: await getAdminSession() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
