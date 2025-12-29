/**
 * Configuration d'authentification
 *
 * Ce fichier centralise les configurations liees a l'authentification
 * pour permettre une maintenance plus facile.
 */

// ============================================
// CONFIGURATION MOT DE PASSE
// ============================================

export const AUTH_PASSWORD_CONFIG = {
	/** Duree de validite du token de reinitialisation (en secondes) - 1 heure */
	resetTokenExpiresIn: 3600,
	/** Longueur minimale du mot de passe */
	minLength: 8,
	/** Longueur maximale du mot de passe */
	maxLength: 128,
} as const;

// ============================================
// CONFIGURATION SESSION
// ============================================

export const AUTH_SESSION_CONFIG = {
	/** Duree de la session (en secondes) - 7 jours */
	expiresIn: 60 * 60 * 24 * 7,
	/** Duree avant rafraichissement automatique (en secondes) - 1 jour */
	updateAge: 60 * 60 * 24,
	/** Configuration du cache cookie pour optimiser les performances */
	cookieCache: {
		enabled: true,
		maxAge: 60 * 5, // 5 minutes
	},
} as const;

// ============================================
// REGLES DE RATE LIMITING
// ============================================

export const AUTH_RATE_LIMIT_RULES = {
	"/sign-in/email": {
		window: 60,
		max: 5,
	},
	"/sign-up/email": {
		window: 60,
		max: 3,
	},
	"/forget-password": {
		window: 60,
		max: 3,
	},
	"/reset-password": {
		window: 60,
		max: 5,
	},
	"/verify-email": {
		window: 60,
		max: 5,
	},
} as const;

// ============================================
// VALIDATION ENVIRONNEMENT
// ============================================

/**
 * Valide que les variables d'environnement requises sont presentes
 * @throws Error si une variable critique est manquante
 */
export function validateAuthEnvironment(): void {
	const requiredEnvVars = [
		"BETTER_AUTH_SECRET",
		"BETTER_AUTH_URL",
	];

	const missing = requiredEnvVars.filter(
		(envVar) => !process.env[envVar]
	);

	if (missing.length > 0 && process.env.NODE_ENV === "production") {
		throw new Error(
			`Variables d'environnement manquantes pour l'authentification: ${missing.join(", ")}`
		);
	}
}
