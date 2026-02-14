/**
 * URL constants - Centralized URLs and routes
 * Used across the application for consistent URL generation
 */

/**
 * Get the base URL for the application
 * Works in both server and client contexts with appropriate fallbacks
 *
 * Priority:
 * 1. NEXT_PUBLIC_BETTER_AUTH_URL (for auth callbacks)
 * 2. BETTER_AUTH_URL (server-side)
 * 3. NEXT_PUBLIC_SITE_URL (general site URL)
 * 4. Development fallback or production URL
 */
export function getBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
		process.env.BETTER_AUTH_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		(process.env.NODE_ENV === "development"
			? "http://localhost:3000"
			: "https://synclune.fr")
	);
}

/**
 * Production URL - Always https://synclune.fr
 * Used for canonical URLs, sitemaps, and SEO
 */
export const PRODUCTION_URL = "https://synclune.fr";

/**
 * Internal route paths
 * Centralized to avoid hardcoded strings across the codebase
 */
export const ROUTES = {
	// Authentication
	AUTH: {
		VERIFY_EMAIL: "/verifier-email",
		FORGOT_PASSWORD: "/mot-de-passe-oublie",
		RESET_PASSWORD: "/reinitialiser-mot-de-passe",
		SIGN_IN: "/connexion",
		SIGN_UP: "/inscription",
	},

	// Customer account
	ACCOUNT: {
		ROOT: "/compte",
		ORDERS: "/commandes",
		ORDER_DETAIL: (orderIdOrNumber: string) =>
			`/commandes/${orderIdOrNumber}`,
		FAVORITES: "/favoris",
		REVIEWS: "/mes-avis",
		PROFILE: "/compte/profil",
		SECURITY: "/compte/securite",
	},

	// Shop
	SHOP: {
		HOME: "/",
		PRODUCTS: "/produits",
		PRODUCT: (slug: string) => `/creations/${slug}`,
		COLLECTIONS: "/collections",
		PRODUCT_TYPE: (slug: string) => `/produits/${slug}`,
		COLLECTION: (slug: string) => `/collections/${slug}`,
		CART: "/panier",
		CHECKOUT: "/paiement",
		CHECKOUT_RETURN: "/paiement/retour",
		CUSTOMIZATION: "/personnalisation",
	},

	// Legal pages
	LEGAL: {
		CGV: "/cgv",
		PRIVACY: "/confidentialite",
		WITHDRAWAL: "/retractation",
		LEGAL_NOTICE: "/mentions-legales",
		ACCESSIBILITY: "/accessibilite",
		COOKIES: "/cookies",
	},

	// Newsletter
	NEWSLETTER: {
		CONFIRM: "/newsletter/confirmer",
		UNSUBSCRIBE: "/newsletter/desinscription",
	},

	// Notifications
	NOTIFICATIONS: {
		UNSUBSCRIBE: "/notifications/desinscription",
	},

	// Admin
	ADMIN: {
		ROOT: "/admin",
		DASHBOARD: "/admin",
		ORDERS: "/admin/ventes/commandes",
		ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
		PRODUCTS: "/admin/catalogue/produits",
		INVENTORY: "/admin/catalogue/inventaire",
	},
} as const;

/**
 * External service URLs
 */
export const EXTERNAL_URLS = {
	// Stripe Dashboard
	STRIPE: {
		PAYMENT: (paymentIntentId: string) =>
			`https://dashboard.stripe.com/payments/${paymentIntentId}`,
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

/**
 * Helper to build production URLs (for canonical/SEO)
 */
export function buildProductionUrl(path: string): string {
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${PRODUCTION_URL}${cleanPath}`;
}
