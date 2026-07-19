/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run 用に依存関係を含む単一の実行可能サーバーを出力する
  output: "standalone",
};

export default nextConfig;
