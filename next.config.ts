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
        ],
      },
    ];
  },

  serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon", "esbuild-wasm"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  images: {
    // Tailles pour srcSet (petites images, thumbnails)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Breakpoints responsive (images principales)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      { protocol: "https", hostname: "x1ain1wpub.ufs.sh", pathname: "/f/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
      { protocol: "https", hostname: "ufs.sh", pathname: "/f/**" },
      { protocol: "https", hostname: "uploadthing.com", pathname: "/**" },
      { protocol: "https", hostname: "uploadthing-prod.s3.us-west-2.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [65, 75, 80, 85, 90],
  },

  cacheComponents: true,

  cacheLife: {
    products: { stale: 900, revalidate: 300, expire: 21600 },
    collections: { stale: 3600, revalidate: 900, expire: 86400 },
    reference: { stale: 604800, revalidate: 86400, expire: 2592000 },
    productDetail: { stale: 900, revalidate: 300, expire: 21600 },
    dashboard: { stale: 60, revalidate: 30, expire: 300 },
    cart: { stale: 300, revalidate: 60, expire: 1800 },
    session: { stale: 60, revalidate: 30, expire: 300 },
    userOrders: { stale: 120, revalidate: 60, expire: 600 },
    relatedProducts: { stale: 1800, revalidate: 600, expire: 10800 },
    skuStock: { stale: 30, revalidate: 15, expire: 60 },
  },
};

const withMDX = createMDX({ extension: /\.(md|mdx)$/ });

export default withMDX(nextConfig);
