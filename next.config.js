const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } = require("next/constants");

module.exports = (phase) => {
  const distDir = process.env.VERCEL === "1"
    ? ".next"
    : process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "production" ? ".next-review" : ".next");
  // The same release ID is bundled into the UI and the public version endpoint.
  // Every build gets a new ID; restarts retain the completed build's ID.
  let appVersion = "development";
  if (phase === PHASE_PRODUCTION_BUILD) appVersion = randomUUID();
  if (phase === PHASE_PRODUCTION_SERVER) appVersion = readFileSync(path.join(__dirname, distDir, "BUILD_ID"), "utf8").trim();

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    // Vercel builds use .next; local production builds stay separate from dev.
    distDir,
    generateBuildId: () => appVersion,
    env: { NEXT_PUBLIC_APP_VERSION: appVersion },
    async headers() {
      return [
        { source: "/:manifest(manifest|super-admin).webmanifest", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
        { source: "/favicon.ico", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      ];
    },
    // ESLint runs separately; Next 15 passes obsolete options to flat config.
    eslint: { ignoreDuringBuilds: true },
    experimental: { cpus: 1 },
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "res.cloudinary.com" },
        { protocol: "https", hostname: "**.cloudinary.com" },
      ],
    },
  };
};
