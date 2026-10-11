/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep precompiled day-to-day use separate from development's route compiler.
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "production" ? ".next-review" : ".next"),
  // The build script runs ESLint separately before Next's build. This avoids
  // Next 15 passing removed options to ESLint's flat configuration loader.
  eslint: { ignoreDuringBuilds: true },
  // Keep build worker count predictable on the cloud test instance and small
  // onsite servers; Next otherwise sizes workers from host CPU/memory.
  experimental: { cpus: 1 },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
};

module.exports = nextConfig;
