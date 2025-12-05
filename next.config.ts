import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "x1ain1wpub.ufs.sh", pathname: "/f/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    useCache: true,
  },

  cacheLife: {
    products: { stale: 900, revalidate: 300, expire: 21600 },
    collections: { stale: 3600, revalidate: 900, expire: 86400 },
    reference: { stale: 604800, revalidate: 86400, expire: 2592000 },
    productDetail: { stale: 900, revalidate: 300, expire: 21600 },
    dashboard: { stale: 60, revalidate: 30, expire: 300 },
    changelog: { stale: 86400, revalidate: 3600, expire: 604800 },
    cart: { stale: 300, revalidate: 60, expire: 1800 },
    session: { stale: 60, revalidate: 30, expire: 300 },
    userOrders: { stale: 120, revalidate: 60, expire: 600 },
    relatedProducts: { stale: 1800, revalidate: 600, expire: 10800 },
    skuStock: { stale: 30, revalidate: 15, expire: 60 },
  },
};

const withMDX = createMDX({ extension: /\.(md|mdx)$/ });

export default withMDX(nextConfig);
