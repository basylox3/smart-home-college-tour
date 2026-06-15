import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { gameDirectory } from "../../../../lib/game-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
};

const headersFor = (filePath: string) => ({
  "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  "Cache-Control": "no-store",
  "Content-Security-Policy": [
    "default-src 'self' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ].join("; "),
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
});

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const requestedPath = params.path.join("/");
  const fullPath = path.resolve(gameDirectory, requestedPath);
  const rootPath = path.resolve(gameDirectory);

  if (!fullPath.startsWith(rootPath + path.sep) && fullPath !== rootPath) {
    return NextResponse.json({ error: "Недопустимый путь." }, { status: 400 });
  }

  try {
    const fileStat = await stat(fullPath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
    }

    const file = await readFile(fullPath);
    return new NextResponse(file, { headers: headersFor(fullPath) });
  } catch {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }
}
