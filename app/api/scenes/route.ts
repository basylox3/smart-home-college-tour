import { NextResponse } from "next/server";
import { readScenes } from "../../../lib/scene-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const scenes = await readScenes();

  return NextResponse.json(
    { scenes },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
