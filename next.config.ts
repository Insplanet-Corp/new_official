import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The legacy WebGL / scroll runtime in /public/js drives the DOM imperatively.
  // Nothing here needs the image optimizer: every asset is a hand-tuned SVG/PNG
  // served straight from /public via plain <img>.
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
