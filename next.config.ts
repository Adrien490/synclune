import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	cacheComponents: true,
	reactCompiler: true,
	experimental: {
		optimizePackageImports: [
			"motion/react",
			"react-day-picker",
			"@dnd-kit/core",
			"@dnd-kit/sortable",
			"cmdk",
			"sonner",
		],
	},

	async rewrites() {
		return [
			// PostHog reverse proxy to avoid ad blockers
			{
				source: "/ingest/static/:path*",
				destination: "https://eu-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://eu.i.posthog.com/:path*",
			},
		];
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
						value: "camera=(), microphone=(), geolocation=()",
					},
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' https://*.ufs.sh https://utfs.io https://uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com https://avatars.githubusercontent.com https://images.unsplash.com data: blob:",
							"font-src 'self'",
							"connect-src 'self' https://*.stripe.com https://api.uploadthing.com https://*.ingest.uploadthing.com https://*.ufs.sh https://utfs.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
							"frame-src https://*.stripe.com",
							"worker-src 'self'",
							"object-src 'none'",
							"frame-ancestors 'none'",
							"base-uri 'self'",
							"form-action 'self'",
							...(process.env.NODE_ENV === "production" ? ["report-uri /api/csp-report"] : []),
						].join("; "),
					},
				],
			},
		];
	},

	serverExternalPackages: [
		"@prisma/client",
		"@prisma/adapter-neon",
		"esbuild",
		"pino",
		"pino-pretty",
	],

	images: {
		qualities: [65, 70, 75, 80, 85, 90],
		minimumCacheTTL: 2678400,
		formats: ["image/avif", "image/webp"],
		remotePatterns: [
			{ protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" },
			{ protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
			{ protocol: "https", hostname: "uploadthing.com", pathname: "/**" },
			{
				protocol: "https",
				hostname: "uploadthing-prod.s3.us-west-2.amazonaws.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
				pathname: "/**",
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
