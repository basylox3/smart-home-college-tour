import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "../../../../../lib/auth";
import { resetScenes } from "../../../../../lib/scene-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Нужен доступ администратора." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  return NextResponse.json({ scenes: await resetScenes() });
}
