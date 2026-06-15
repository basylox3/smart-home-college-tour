import { NextResponse } from "next/server";
import { readLocalGameFiles } from "../../../../lib/game-files";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { files: await readLocalGameFiles() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
