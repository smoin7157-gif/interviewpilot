import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No-nonce CSP (static-friendly), per the Next 16 CSP guide. 'unsafe-inline'
// for scripts/styles covers the framework's inline bootstrap; 'unsafe-eval' is
// dev-only (React refresh). blob:/data: keep the pdf.js worker and media
// previews working; fonts.googleapis/gstatic serve next/font; Web Speech and
// getUserMedia need blob: + 'self' in connect-src/media.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' blob: data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera/mic are used by the AI mock interview; everything else is off.
    value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // pdf.js resolves its worker through a dynamic import that bundlers rewrite
  // to a non-existent virtual module; loading the real package at runtime
  // (like plain Node) keeps resume parsing working.
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;