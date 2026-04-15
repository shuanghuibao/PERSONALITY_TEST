import { defineConfig } from "vite";

// 使用相对路径，便于 GitHub Pages 项目页（子路径）与本地预览
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
