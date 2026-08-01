/**
 * URL constants - Centralized URLs and routes
 * Used across the application for consistent URL generation
 */

/**
 * Get the base URL for the application
 * Works in both server and client contexts with appropriate fallbacks
 *
 * Priority:
 * 1. BETTER_AUTH_URL (primary)
 * 2. NEXT_PUBLIC_SITE_URL (general site URL)
 * 3. Development fallback or production URL
 */
export function getBaseUrl(): string {
	return (
		process.env.BETTER_AUTH_URL ??
		process.env.NEXT_PUBLIC_SITE_URL ??
		(process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://synclune.fr")
	);
}

/**
 * Internal route paths
 * Centralized to avoid hardcoded strings across the codebase
 */
export const ROUTES = {
	// Authentication — accès administration uniquement (cf. `/connexion`).
	// Pas de `SIGN_UP` : l'inscription est fermée (retrait de l'espace client
	// 2026-07-31), la route `/inscription` n'existe plus.
	AUTH: {
		VERIFY_EMAIL: "/verifier-email",
		FORGOT_PASSWORD: "/mot-de-passe-oublie",
		RESET_PASSWORD: "/reinitialiser-mot-de-passe",
		SIGN_IN: "/connexion",
	},

	// Shop
	//
	// Plus de bloc `ACCOUNT` : `/commandes` et `/parametres` ont disparu avec
	// l'espace client. `/favoris` survit et rejoint la boutique — la wishlist est
	// portée par le cookie `wishlist_session`, pas par un compte.
	SHOP: {
		HOME: "/",
		PRODUCTS: "/produits",
		// Base path for product detail pages — used by useActiveNavbarItem to map /creations/* → /produits
		PRODUCT_DETAIL_PREFIX: "/creations",
		PRODUCT: (slug: string) => `/creations/${slug}`,
		COLLECTIONS: "/collections",
		PRODUCT_TYPE: (slug: string) => `/produits/${slug}`,
		COLLECTION: (slug: string) => `/collections/${slug}`,
		FAVORITES: "/favoris",
		CHECKOUT: "/paiement",
		CHECKOUT_RETURN: "/paiement/retour",
		// Suivi de commande invité, authentifié par token HMAC dans l'URL.
		// C'est désormais le SEUL chemin par lequel un client consulte sa commande.
		ORDER_TRACKING: "/suivi-commande",
		ABOUT: "/a-propos",
		HELP: "/aide",
	},

	// Legal pages
	LEGAL: {
		HUB: "/informations-legales",
		CGV: "/cgv",
		PRIVACY: "/confidentialite",
		WITHDRAWAL: "/retractation",
		LEGAL_NOTICE: "/mentions-legales",
		ACCESSIBILITY: "/accessibilite",
		COOKIES: "/cookies",
	},

	// Admin
	//
	// Pas de `CUSTOMERS` / `CUSTOMER_DETAIL` : `/admin/clients` a disparu avec la
	// gestion des utilisateurs. L'identité d'un acheteur se lit sur les snapshots
	// de sa commande (invariant #5), pas sur une fiche.
	ADMIN: {
		ROOT: "/admin",
		DASHBOARD: "/admin",
		ORDERS: "/admin/ventes/commandes",
		ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
		REFUNDS: "/admin/ventes/remboursements",
		PRODUCTS: "/admin/catalogue/produits",
		STORE_CONFIG: "/admin/configuration/boutique",
	},
} as const;

/**
 * External service URLs
 */
export const EXTERNAL_URLS = {
	// Stripe Dashboard (test mode uses /test/ prefix)
	STRIPE: {
		PAYMENT: (paymentIntentId: string) =>
			`https://dashboard.stripe.com/payments/${paymentIntentId}`,
		DISPUTE: (disputeId: string) => {
			const isTest = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
			return `https://dashboard.stripe.com/${isTest ? "test/" : ""}disputes/${disputeId}`;
		},
		WEBHOOKS: "https://dashboard.stripe.com/webhooks",
	},

	// Schema.org
	SCHEMA_ORG: {
		IN_STOCK: "https://schema.org/InStock",
		OUT_OF_STOCK: "https://schema.org/OutOfStock",
		LIMITED_AVAILABILITY: "https://schema.org/LimitedAvailability",
		PRE_ORDER: "https://schema.org/PreOrder",
	},
} as const;

/**
 * Helper to build full URLs
 */
export function buildUrl(path: string): string {
	const base = getBaseUrl();
	// Remove trailing slash from base and leading slash from path to avoid double slashes
	const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${cleanBase}${cleanPath}`;
}
