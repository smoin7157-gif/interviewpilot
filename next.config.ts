import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf.js resolves its worker through a dynamic import that bundlers rewrite
  // to a non-existent virtual module; loading the real package at runtime
  // (like plain Node) keeps resume parsing working.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;