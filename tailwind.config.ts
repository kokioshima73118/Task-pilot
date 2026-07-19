import type { Config } from "tailwindcss";
import { join } from "path";

// cwd がプロジェクト外でも解決できるよう __dirname 基準の絶対パスにする。
// Windows ではグロブがバックスラッシュに一致しないためスラッシュへ正規化する。
const p = (glob: string) => join(__dirname, glob).replace(/\\/g, "/");

const config: Config = {
  content: [
    p("pages/**/*.{js,ts,jsx,tsx,mdx}"),
    p("components/**/*.{js,ts,jsx,tsx,mdx}"),
    p("app/**/*.{js,ts,jsx,tsx,mdx}"),
    p("lib/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
