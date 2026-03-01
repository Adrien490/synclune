import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
	cacheComponents: true,
	experimental: {
		optimizePackageImports: [
			"motion/react",
			"recharts",
			"lucide-react",
			"react-day-picker",
			"@dnd-kit/core",
			"@dnd-kit/sortable",
			"cmdk",
			"sonner",
		],
	},

	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
					},
				],
			},
		];
	},

	serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon", "esbuild-wasm"],

	images: {
		qualities: [65, 70, 75, 80, 85, 90],
		minimumCacheTTL: 2678400,
		formats: ["image/avif", "image/webp"],
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
			{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
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

export default withSentryConfig(withSerwist(nextConfig), {
	tunnelRoute: "/monitoring",
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	telemetry: false,
	silent: !process.env.CI,
});
