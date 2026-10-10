import type { NextConfig } from "next";

// En Codespaces el header Origin llega como localhost:3000 mientras x-forwarded-host
// apunta a <codespace>-3000.app.github.dev. Next valida el Origin contra esta lista.
const codespaceOrigins = process.env.CODESPACE_NAME
  ? ["localhost:3000", `${process.env.CODESPACE_NAME}-3000.app.github.dev`]
  : [];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "11mb", allowedOrigins: codespaceOrigins },
  },
  cacheComponents: true,
  partialPrefetching: true,

};

export default nextConfig;
