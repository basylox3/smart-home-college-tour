import { NextResponse } from "next/server";
import { readGameSettings } from "../../../lib/game-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { settings: await readGameSettings() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
