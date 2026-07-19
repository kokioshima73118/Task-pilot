import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // cwd がプロジェクト外でも tailwind.config.ts を確実に解決する
    tailwindcss: { config: join(__dirname, "tailwind.config.ts") },
  },
};

export default config;
