import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSession,
  isSameOriginRequest,
  isValidAdminPassword,
} from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();

const getClientKey = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

const isRateLimited = (request: NextRequest) => {
  const key = getClientKey(request);
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt || attempt.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  attempt.count += 1;
  return attempt.count > 10;
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите через минуту." }, { status: 429 });
  }

  let payload: { password?: unknown };

  try {
    payload = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const password = typeof payload.password === "string" ? payload.password : "";

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: "Неверный пароль администратора." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(), adminCookieOptions);

  return response;
}
