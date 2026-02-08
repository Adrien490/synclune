import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,

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

  images: {
    qualities: [65, 70, 75, 80, 85, 90],
    remotePatterns: [
      { protocol: "https", hostname: "x1ain1wpub.ufs.sh", pathname: "/f/**", search: "" },
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**", search: "" },
      { protocol: "https", hostname: "ufs.sh", pathname: "/f/**", search: "" },
      { protocol: "https", hostname: "uploadthing.com", pathname: "/**", search: "" },
      {
        protocol: "https",
        hostname: "uploadthing-prod.s3.us-west-2.amazonaws.com",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
        search: "",
      },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**", search: "" },
    ],
  },

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

export default nextConfig;
