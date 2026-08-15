/**
 * URL constants - Centralized URLs and routes
 * Used across the application for consistent URL generation
 */

/**
 * Internal route paths
 * Centralized to avoid hardcoded strings across the codebase
 */
export const ROUTES = {
	// Authentication — accès administration uniquement, un seul mot de passe
	// (migration lean, lot 1). Plus de vérification d'email ni de reset : la
	// rotation du mot de passe se fait par la variable d'env ADMIN_PASSWORD.
	AUTH: {
		SIGN_IN: "/admin/connexion",
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
		CHECKOUT_CANCEL: "/paiement/annulation",
		// Suivi de commande invité, authentifié par token HMAC dans l'URL.
		// C'est désormais le SEUL chemin par lequel un client consulte sa commande.
		ORDER_TRACKING: "/suivi-commande",
		ABOUT: "/a-propos",
		// ⚠️ Plus de `HELP` : la section FAQ a été retirée de la landing le
		// 2026-08-08 (à refaire), avec son ancre `/#faq`, la redirection 308 de
		// `/aide` et les liens « Aide » du pied de page et du volet mobile.
		// Si elle revient sous forme d'ANCRE et non de page, se rappeler que ce
		// n'est alors pas un pathname : ne pas le passer à un helper qui compare
		// des chemins (`resolveNavbarSection`, `isCatalogueRoute`).
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
		PRODUCTS: "/admin/catalogue/produits",
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
