import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "smart_tour_admin";
const sessionLifetimeSeconds = 60 * 60 * 8;
const disabledProductionSecret = `disabled-${randomBytes(32).toString("hex")}`;

const getAdminPassword = () => process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? disabledProductionSecret : "123456789");

const getSessionSecret = () => process.env.ADMIN_SESSION_SECRET || getAdminPassword();

const normalizeOrigin = (value?: string | null) => {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const getConfiguredOrigins = () =>
  (process.env.ADMIN_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);

const getTrustedOrigins = (request: NextRequest) => {
  const requestUrl = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origins = new Set<string>([
    requestUrl.origin,
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    ...getConfiguredOrigins(),
  ]);

  if (host) {
    origins.add(`${protocol}://${host}`);
  }

  if (forwardedHost) {
    origins.add(`${protocol}://${forwardedHost}`);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://10.20.0.34:3000");
    origins.add("http://10.20.0.22:3000");
  }

  origins.delete("");
  return origins;
};

const sign = (value: string) => createHmac("sha256", getSessionSecret()).update(value).digest("base64url");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const isValidAdminPassword = (password: string) => safeEqual(password, getAdminPassword());

export const createAdminSession = () => {
  const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
  const payload = `admin.${expiresAt}`;

  return `${payload}.${sign(payload)}`;
};

export const validateAdminSessionValue = (sessionValue?: string) => {
  if (!sessionValue) {
    return false;
  }

  const parts = sessionValue.split(".");

  if (parts.length !== 3 || parts[0] !== "admin") {
    return false;
  }

  const expiresAt = Number(parts[1]);

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;

  return safeEqual(parts[2], sign(payload));
};

export const getAdminSession = async () => {
  const cookieStore = await cookies();
  return validateAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
};

export const isAdminRequest = (request: NextRequest) =>
  validateAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

export const isSameOriginRequest = (request: NextRequest) => {
  const trustedOrigins = getTrustedOrigins(request);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const isTrusted = (value: string) => {
    const normalized = normalizeOrigin(value);
    return Boolean(normalized && trustedOrigins.has(normalized));
  };

  if (origin) {
    return isTrusted(origin);
  }

  if (referer) {
    return isTrusted(referer);
  }

  return true;
};

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: sessionLifetimeSeconds,
};
