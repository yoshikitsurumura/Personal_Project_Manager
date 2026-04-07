// =============================================================================
// [cursor] Next.js ビルド設定
// output: "standalone" は .next/standalone に Node サーバーと最小依存だけを出力する。
// Docker イメージを小さくし、Kubernetes で本番実行するときの定番オプション。
// =============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;

