const isProduction = process.env.NODE_ENV === "production";
const adminAllowedOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || "http://10.20.0.34:3000,http://10.20.0.22:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const devHttpOrigins = [
  ...adminAllowedOrigins,
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://relearn-distaste-pupil.ngrok-free.dev",
  "https://*.ngrok-free.dev",
  "https://*.trycloudflare.com",
];
const devConnectSources = isProduction
  ? []
  : [
      ...devHttpOrigins,
      ...devHttpOrigins.map((origin) => origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:")),
    ];
const allowedDevOrigins = [
  ...new Set(
    [
      ...adminAllowedOrigins,
      "https://relearn-distaste-pupil.ngrok-free.dev",
      "https://*.ngrok-free.dev",
      "https://*.trycloudflare.com",
    ]
      .map((origin) => {
        if (origin.includes("*")) return origin.replace(/^https?:\/\//, "");

        try {
          return new URL(origin).hostname;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  ),
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (isProduction ? "" : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      ["connect-src 'self'", ...devConnectSources].join(" "),
      "frame-src 'self' https: http:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const gameAssetHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
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
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/game/files/:path*",
        headers: gameAssetHeaders,
      },
    ];
  },
};

export default nextConfig;
