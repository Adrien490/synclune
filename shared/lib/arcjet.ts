import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";

/**
 * Configuration Arcjet pour la protection de l'application
 *
 * 🛡️ Shield : Protection contre les attaques courantes (SQL injection, XSS, etc.)
 * 🤖 Bot Detection : Bloque les bots malveillants tout en autorisant les crawlers légitimes
 * ⏱️ Rate Limiting : Limite le nombre de requêtes par IP
 *
 * Docs : https://docs.arcjet.com
 */

/**
 * Instance Arcjet principale pour les routes API générales
 */
export const aj = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield protège contre les attaques courantes (SQL injection, XSS, etc.)
		shield({ mode: "LIVE" }),

		// Détection de bots - Autorise uniquement les crawlers légitimes
		detectBot({
			mode: "LIVE", // Bloque les requêtes. Utiliser "DRY_RUN" pour logs uniquement
			allow: [
				"CATEGORY:SEARCH_ENGINE", // Google, Bing, DuckDuckGo, etc.
				"CATEGORY:MONITOR", // Services de monitoring (Uptime Robot, etc.)
				"CATEGORY:PREVIEW", // Previews de liens (Slack, Discord, WhatsApp)
			],
		}),

		// Rate limiting global : 10 requêtes par 10 secondes par IP
		tokenBucket({
			mode: "LIVE",
			refillRate: 10, // Recharge 10 tokens par intervalle
			interval: 10, // Intervalle de 10 secondes
			capacity: 20, // Capacité max du bucket
		}),
	],
});

/**
 * Instance Arcjet spécifique pour la newsletter
 *
 * ✨ Configuration adaptée pour les inscriptions newsletter :
 * - Rate limiting strict (5 inscriptions/heure)
 * - Protection anti-bot renforcée
 * - Shield contre les injections
 */
export const ajNewsletter = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield contre les attaques
		shield({ mode: "LIVE" }),

		// Bot detection stricte - Bloque TOUS les bots pour éviter le spam
		detectBot({
			mode: "LIVE",
			allow: [], // Aucun bot autorisé sur le formulaire d'inscription
		}),

		// Rate limiting strict pour les inscriptions newsletter
		// 5 inscriptions par heure par IP (cohérent avec notre rate-limit.ts)
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"], // Track par IP source
			refillRate: 5, // 5 tokens par intervalle
			interval: 3600, // Intervalle de 1 heure (3600 secondes)
			capacity: 5, // Capacité max de 5 tokens
		}),
	],
});

/**
 * Instance Arcjet pour les endpoints de paiement
 *
 * Protection contre les abus du flow de paiement :
 * - Rate limiting : 15 tentatives par heure par IP (coherent avec PAYMENT_LIMITS.CREATE_SESSION)
 * - Shield contre les attaques
 * - Bot detection stricte
 */
export const ajPayment = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		shield({ mode: "LIVE" }),
		detectBot({
			mode: "LIVE",
			allow: [],
		}),
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"],
			refillRate: 15,
			interval: 3600,
			capacity: 15,
		}),
	],
});

/**
 * Instance Arcjet pour la confirmation d'inscription newsletter
 *
 * 🔐 Protection contre le brute-force des tokens de confirmation :
 * - Rate limiting : 10 tentatives par heure par IP
 * - Shield contre les attaques
 */
export const ajNewsletterConfirm = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield contre les attaques
		shield({ mode: "LIVE" }),

		// Rate limiting : 10 tentatives de confirmation par heure par IP
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"],
			refillRate: 10, // 10 tokens par intervalle
			interval: 3600, // Intervalle de 1 heure (3600 secondes)
			capacity: 10, // Capacité max de 10 tokens
		}),
	],
});

/**
 * Instance Arcjet pour la désinscription newsletter
 *
 * 🔐 Protection contre les attaques de désinscription massive :
 * - Rate limiting : 10 désinscriptions par heure par IP
 * - Shield contre les attaques
 * - Évite l'énumération de tokens de désinscription
 */
export const ajNewsletterUnsubscribe = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield contre les attaques
		shield({ mode: "LIVE" }),

		// Rate limiting : 10 désinscriptions par heure par IP
		// Plus permissif que subscribe (5/h) car légitime pour utilisateurs frustrés
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"],
			refillRate: 10, // 10 tokens par intervalle
			interval: 3600, // Intervalle de 1 heure (3600 secondes)
			capacity: 10, // Capacité max de 10 tokens
		}),
	],
});

/**
 * Instance Arcjet pour la validation de codes promo
 *
 * Protection contre le brute-force de codes promo :
 * - Rate limiting : 10 tentatives par 15 minutes par IP
 * - Shield contre les attaques
 * - Bot detection stricte
 */
export const ajDiscountValidation = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield contre les attaques
		shield({ mode: "LIVE" }),

		// Bot detection stricte - Aucun bot autorise
		detectBot({
			mode: "LIVE",
			allow: [],
		}),

		// Rate limiting : 10 tentatives par 15 minutes par IP
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"],
			refillRate: 10, // 10 tokens par intervalle
			interval: 900, // Intervalle de 15 minutes (900 secondes)
			capacity: 10, // Capacite max de 10 tokens
		}),
	],
});

/**
 * Instance Arcjet pour l'authentification (générique)
 *
 * 🔐 Protection pour les endpoints d'authentification critiques :
 * - Sign in (brute-force protection)
 * - Sign up (spam accounts protection)
 * - Password reset (enumeration protection)
 *
 * Configuration optimisée pour version gratuite Arcjet :
 * - Rate limiting : 5 tentatives / 15 minutes par IP
 * - Shield contre SQL injection, XSS, etc.
 * - Bot detection stricte (aucun bot autorisé)
 */
export const ajAuth = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		// Shield contre les attaques courantes
		shield({ mode: "LIVE" }),

		// Bot detection stricte - Aucun bot autorisé sur les formulaires auth
		detectBot({
			mode: "LIVE",
			allow: [], // Bloquer tous les bots
		}),

		// Rate limiting strict pour l'authentification
		// 5 tentatives par 15 minutes par IP
		tokenBucket({
			mode: "LIVE",
			characteristics: ["ip.src"], // Track par IP source
			refillRate: 5, // 5 tokens par intervalle
			interval: 900, // Intervalle de 15 minutes (900 secondes)
			capacity: 10, // Capacité max de 10 tokens (permet un petit burst)
		}),
	],
});
