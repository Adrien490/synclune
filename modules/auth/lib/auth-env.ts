/**
 * Validation des variables d'environnement pour le module Auth
 *
 * Ce fichier valide les variables d'environnement critiques au démarrage
 * pour éviter les erreurs silencieuses en production.
 */

export function validateAuthEnvironment(): void {
	if (process.env.NODE_ENV !== "production") {
		return;
	}

	if (!process.env.STRIPE_SECRET_KEY) {
		throw new Error("STRIPE_SECRET_KEY est requis en production");
	}

	if (!process.env.BETTER_AUTH_SECRET) {
		throw new Error("BETTER_AUTH_SECRET est requis en production");
	}

	// Valider la longueur minimale du secret (32 caractères pour une entropie suffisante)
	if (process.env.BETTER_AUTH_SECRET.length < 32) {
		throw new Error("BETTER_AUTH_SECRET doit avoir au moins 32 caractères");
	}

	if (!process.env.BETTER_AUTH_URL) {
		throw new Error("BETTER_AUTH_URL est requis en production");
	}
}

/**
 * Configuration des règles de rate limiting par endpoint
 */
export const AUTH_RATE_LIMIT_RULES = {
	// Login: 5 tentatives par 15 minutes
	"/sign-in/email": {
		window: 15 * 60,
		max: 5,
	},
	// Signup: 3 inscriptions par heure
	"/sign-up/email": {
		window: 60 * 60,
		max: 3,
	},
	// Password reset request: 3 demandes par heure
	"/forget-password": {
		window: 60 * 60,
		max: 3,
	},
	// Password reset: 3 tentatives par heure
	"/reset-password": {
		window: 60 * 60,
		max: 3,
	},
	// Email verification: 5 envois par heure
	"/send-verification-email": {
		window: 60 * 60,
		max: 5,
	},
	// Change password: 3 changements par heure
	"/change-password": {
		window: 60 * 60,
		max: 3,
	},
} as const;

/**
 * Configuration des sessions
 */
export const AUTH_SESSION_CONFIG = {
	expiresIn: 60 * 60 * 24 * 7, // 7 jours
	updateAge: 60 * 60 * 24, // 24 heures
	cookieCache: {
		enabled: true,
		maxAge: 5 * 60, // 5 minutes
	},
} as const;

/**
 * Configuration des tokens de réinitialisation de mot de passe
 */
export const AUTH_PASSWORD_CONFIG = {
	resetTokenExpiresIn: 15 * 60, // 15 minutes (OWASP best practice)
	minLength: 8,
	maxLength: 128,
} as const;
