/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dossier de build séparé possible (ex. tests en parallèle d'un « npm run dev »)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "sharp", "nodemailer"],
  experimental: {
    // Import de photos depuis la console (10 Mo max, voir src/lib/medias.js)
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
