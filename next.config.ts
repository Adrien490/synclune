import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { UPLOADTHING_APP_IDS } from "./shared/constants/uploadthing";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	cacheComponents: true,
	reactCompiler: true,
	experimental: {
		authInterrupts: true,
		turbopackFileSystemCacheForBuild: true,
		// NOTE PERF : `inlineCss: true` a été testé (audit Lighthouse 2026-05-29) et
		// REJETÉ — inliner le bundle CSS (~64 KiB) dans le <head> gonfle le document
		// critique et dégrade nettement le FCP mobile sur 4G (/produits +19 %,
		// /creations +27 %). À ne pas réactiver sans re-mesure mobile.
		optimizePackageImports: [
			"@base-ui/react",
			"motion/react",
			"lucide-react",
			"react-day-picker",
			"@dnd-kit/react",
			"@dnd-kit/dom",
			"@dnd-kit/helpers",
			"sonner",
			"date-fns",
			"embla-carousel-react",
			"@tanstack/react-form",
			"@radix-ui/react-focus-scope",
			"@radix-ui/react-navigation-menu",
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

	async redirects() {
		return [
			// Page À propos temporairement masquée — préserve le link equity externe
			{ source: "/a-propos", destination: "/", permanent: true },
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
						// `payment` délégué à l'origine Stripe : sans cette délégation, la Payment Request API
						// (Apple Pay / Google Pay via <ExpressCheckoutElement>) est bloquée dans l'iframe cross-origin Stripe.
						value:
							'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
					},
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
							"style-src 'self' 'unsafe-inline'",
							// Unsplash uniquement hors production (images de seed) : l'hôte est
							// aussi absent de `remotePatterns` en prod. Les deux listes doivent
							// rester cohérentes, sinon l'image passe l'optimiseur puis se fait
							// bloquer au rendu (ou l'inverse).
							`img-src 'self' https://*.ufs.sh https://utfs.io https://uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com data: blob:${process.env.NODE_ENV === "production" ? "" : " https://images.unsplash.com"}`,
							"font-src 'self'",
							"connect-src 'self' https://*.stripe.com https://m.stripe.network https://api.uploadthing.com https://*.ingest.uploadthing.com https://*.ufs.sh https://utfs.io",
							"frame-src https://*.stripe.com https://m.stripe.network",
							// Audit média M9 : `media-src` doit couvrir les mêmes hôtes que
							// `img-src` / ALLOWED_MEDIA_DOMAINS. Une vidéo encore servie depuis
							// uploadthing.com ou le bucket S3 legacy passait la validation Zod,
							// s'enregistrait en base, puis était bloquée à la lecture.
							"media-src 'self' https://*.ufs.sh https://utfs.io https://uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com",
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
		// 2 paliers seulement (SSOT : IMAGE_QUALITY dans
		// modules/media/constants/image-config.constants.ts). Vercel facture chaque
		// couple (source, largeur, qualité) : 7 valeurs × 8 largeurs = jusqu'à 56
		// variantes par image source, pour des écarts invisibles entre 70 et 75.
		qualities: [65, 80],
		// Déclaré explicitement pour retirer 3840 : `compress-image.ts` plafonne les
		// uploads à 2048 px, donc demander 3840 ne fait que ré-encoder une source
		// plus petite (Next n'upscale pas) tout en facturant une variante de plus.
		// Doit rester aligné sur DEVICE_SIZES (régression device-sizes-match-next-config).
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
		minimumCacheTTL: 2678400,
		formats: ["image/avif", "image/webp"],
		// `/logo.jpg` et `/adri-lele.jpg` retirés avec leurs fichiers (414 Ko) : ces
		// deux entrées d'allowlist étaient leurs SEULES références du dépôt. Tous
		// les consommateurs réels utilisent `logo.webp` (6,8 Ko).
		localPatterns: [
			{ pathname: "/logo.webp", search: "" },
			{ pathname: "/icons/**", search: "" },
			{ pathname: "/splash/**", search: "" },
		],
		// ⚠️ SURFACE FACTURABLE — audit coûts P1-1. Chaque hôte listé ici autorise
		// n'importe qui à faire transformer une image par l'optimiseur Vercel via
		// `/_next/image?url=…`, route EXCLUE du matcher de `proxy.ts` donc sans
		// rate limit. Le coût est facturé par couple (source, largeur, qualité) :
		// un hôte multi-tenant = un nombre de sources non borné = une facture non
		// bornée. N'autoriser que des hôtes dont Synclune contrôle le contenu.
		remotePatterns: [
			// Épinglé sur les app-ids Synclune (SSOT `shared/constants/uploadthing`).
			// `*.ufs.sh` a été retiré : le domaine est multi-tenant, le wildcard
			// laissait passer les fichiers de n'importe quel compte UploadThing.
			...UPLOADTHING_APP_IDS.map((appId) => ({
				protocol: "https" as const,
				hostname: `${appId}.ufs.sh`,
				pathname: "/f/**" as const,
			})),
			// Hôte legacy v6, conservé pour les lignes média antérieures à la
			// migration `<appId>.ufs.sh`. RÉSIDU ASSUMÉ : il est global à tous les
			// tenants UploadThing et ne peut pas être scopé par app-id. À retirer
			// une fois confirmé qu'aucune ligne `SkuMedia`/`Product` ne le référence
			// (`SELECT count(*) … WHERE url LIKE 'https://utfs.io/%'`).
			{ protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
			// `uploadthing.com/**` et le bucket S3 `uploadthing-prod…/**` ont été
			// retirés de l'OPTIMISEUR : ce sont des hôtes partagés en `/**` (aucun
			// préfixe de chemin contraignant) et aucun média servi par next/image
			// n'en provient. Ils restent dans `img-src`/`media-src` de la CSP
			// ci-dessus, où ils ne coûtent rien — une vidéo legacy ne passe pas par
			// l'optimiseur.
			// `prisma/seed.ts` pointe les produits de démo vers Unsplash (audit média
			// M15 : retrait écarté pour ne pas casser le dev local). Restreint au
			// NON-PRODUCTION : en prod l'hôte était inutile (absent de `img-src`, donc
			// bloqué par la CSP de toute façon) tout en laissant `/_next/image?url=…`
			// ouvert à n'importe quelle image Unsplash — un vecteur d'épuisement du
			// quota de transformations Vercel.
			...(process.env.NODE_ENV === "production"
				? []
				: [
						{
							protocol: "https" as const,
							hostname: "images.unsplash.com",
							pathname: "/**" as const,
						},
					]),
		],
	},

	cacheLife: {
		catalog: { stale: 900, revalidate: 300, expire: 21600 },
		checkout: { stale: 60, revalidate: 30, expire: 300 },
		reference: { stale: 604800, revalidate: 86400, expire: 2592000 },
		user: { stale: 120, revalidate: 60, expire: 600 },
	},
};

export default withSentryConfig(nextConfig, {
	tunnelRoute: "/monitoring",
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	telemetry: false,
	silent: !process.env.CI,
});
