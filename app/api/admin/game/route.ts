import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "../../../../lib/auth";
import { readGameSettings, updateGameSettings } from "../../../../lib/game-store";
import type { GameSettingsInput } from "../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const unauthorized = () => NextResponse.json({ error: "Нужен доступ администратора." }, { status: 401 });

const asInput = (value: unknown): GameSettingsInput => {
  const payload = value as Partial<GameSettingsInput>;

  return {
    enabled: Boolean(payload.enabled),
    title: typeof payload.title === "string" ? payload.title : "",
    description: typeof payload.description === "string" ? payload.description : "",
    gameUrl: typeof payload.gameUrl === "string" ? payload.gameUrl : "",
  };
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  return NextResponse.json(
    { settings: await readGameSettings() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  try {
    const body = await request.json();
    return NextResponse.json({ settings: await updateGameSettings(asInput(body)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось обновить настройки игры." },
      { status: 400 },
    );
  }
}
