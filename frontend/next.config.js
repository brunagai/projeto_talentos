/** @type {import('next').NextConfig} */
function resolveApiUrl() {
  let raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  raw = raw.replace(/\/+$/, "");
  if (!raw) {
    return "http://localhost:8000";
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  return raw;
}

const apiUrl = resolveApiUrl();
const isDev = process.env.NODE_ENV !== "production";

function contentSecurityPolicy() {
  const connectSrc = ["'self'"];
  // Next.js ainda injeta bootstrap inline; nonce completo fica para Fase F.
  // Bloqueamos handlers inline via script-src-attr.
  const scriptSrc = ["'self'", "'unsafe-inline'"];

  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push(
      "http://127.0.0.1:8000",
      "http://localhost:8000",
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
    );
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "script-src-attr 'none'",
    // Tailwind / estilos runtime do App Router
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

if (!isDev) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    proxyTimeout: 120_000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
