import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateProductionEnvironment } from "./src/api/config.js";

export default defineConfig(({ command, mode, isPreview }) => {
  if (command === "build" && !isPreview)
    validateProductionEnvironment(loadEnv(mode, process.cwd(), "VITE_"));
  return { plugins: [react(), tailwindcss()] };
});
