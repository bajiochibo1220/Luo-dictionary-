import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("../../src", import.meta.url)) },
      // Tailwind inlines the shared font CSS; keep its URLs anchored to the
      // original assets directory when Vite processes the resulting stylesheet.
      { find: /^\.\/([^/]+\.woff2)$/, replacement: fileURLToPath(new URL("../../src/assets/fonts/", import.meta.url)).replace(/\\/g, "/") + "$1" },
    ],
    dedupe: ["react", "react-dom"],
  },
  css: { postcss: { plugins: [tailwind()] } },
  server: { fs: { allow: [fileURLToPath(new URL("../../", import.meta.url))] } },
  build: { outDir: "dist", emptyOutDir: true },
});
