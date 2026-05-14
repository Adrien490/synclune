import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	cacheComponents: true,
	reactCompiler: true,
	experimental: {
		turbopackFileSystemCacheForBuild: true,
		optimizePackageImports: [
			"motion/react",
			"lucide-react",
			"recharts",
			"react-day-picker",
			"@dnd-kit/react",
			"@dnd-kit/dom",
			"@dnd-kit/helpers",
			"cmdk",
			"sonner",
			"date-fns",
			"embla-carousel-react",
		],
	},

	async rewrites() {
		return {
			beforeFiles: [
				// Sentry deletes .map after upload but Turbopack leaves
				// sourceMappingURL comments → rewrite to 204 noop
				{
					source: "/_next/static/:path*.map",
					destination: "/api/noop",
				},
			],
			afterFiles: [],
			fallback: [],
		};
	},

	async headers() {
		return [
			{
				source: "/serwist/:path*",
				headers: [{ key: "Service-Worker-Allowed", value: "/" }],
			},
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
							`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://va.vercel-scripts.com`,
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' https://*.ufs.sh https://utfs.io https://uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com data: blob:",
							"font-src 'self'",
							"connect-src 'self' https://*.stripe.com https://api.uploadthing.com https://*.ingest.uploadthing.com https://*.ufs.sh https://utfs.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
							"frame-src https://*.stripe.com",
							"media-src 'self' https://*.ufs.sh https://utfs.io",
							"worker-src 'self' blob:",
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
		"pino",
		"pino-pretty",
		"sharp",
	],

	images: {
		qualities: [60, 65, 70, 75, 80, 85, 90],
		minimumCacheTTL: 2678400,
		formats: ["image/avif", "image/webp"],
		localPatterns: [
			{ pathname: "/logo.webp", search: "" },
			{ pathname: "/logo.jpg", search: "" },
			{ pathname: "/adri-lele.jpg", search: "" },
			{ pathname: "/icons/**", search: "" },
			{ pathname: "/splash/**", search: "" },
		],
		remotePatterns: [
			{ protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" },
			{ protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
			{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
			{ protocol: "https", hostname: "uploadthing.com", pathname: "/**" },
			{
				protocol: "https",
				hostname: "uploadthing-prod.s3.us-west-2.amazonaws.com",
				pathname: "/**",
			},
		],
	},

	cacheLife: {
		catalog: { stale: 900, revalidate: 300, expire: 21600 },
		checkout: { stale: 60, revalidate: 30, expire: 300 },
		reference: { stale: 604800, revalidate: 86400, expire: 2592000 },
		user: { stale: 120, revalidate: 60, expire: 600 },
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
