/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
