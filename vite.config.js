
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "CRANK SESSION",
        short_name: "CRANK",
        description: "Touch-first mobile music production studio",
        theme_color: "#171717",
        background_color: "#171717",
        display: "standalone",
        orientation: "landscape",
        start_url: "./",
        scope: "./"
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"]
      }
    })
  ]
});

