/**
 * Configuration d'authentification
 *
 * Ce fichier centralise les configurations liees a l'authentification
 * pour permettre une maintenance plus facile.
 */

import { logger } from "@/shared/lib/logger";

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

/**
 * RATE-AUDIT-006 : double enforcement intentionnel (défense en profondeur).
 *
 * Ces règles sont la PREMIÈRE ligne de défense, appliquées par Better Auth sur
 * le handler brut `/api/auth/[...all]` (POST directs, fenêtre 60 s par IP par
 * endpoint). Le handler étant publiquement atteignable, il court-circuite le
 * rate limit des Server Actions — ces règles sont donc indispensables.
 *
 * La SECONDE ligne est le rate limit applicatif des Server Actions
 * (`AUTH_LIMITS.*` dans `shared/lib/rate-limit-config.ts`, fenêtres min/h par
 * user/IP), appliqué via `enforceRateLimitForCurrentUser` sur le chemin UI.
 *
 * Granularités et fenêtres divergent volontairement (IP/60 s ici vs user/15min-1h
 * côté action). NE PAS « harmoniser » ou supprimer l'une des deux couches : elles
 * protègent deux chemins d'accès distincts. cf. CLAUDE.md § Security.
 */
export const AUTH_RATE_LIMIT_RULES = {
	"/sign-in/email": {
		window: 60,
		max: 5,
	},
	"/sign-in/social": {
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
	"/change-password": {
		window: 60,
		max: 3,
	},
} as const;

// ============================================
// VALIDATION ENVIRONNEMENT
// ============================================

/**
 * Valide que les variables d'environnement requises sont presentes
 * @throws Error en production si une variable critique est manquante
 * @logs Warning en dev/test si une variable critique est manquante
 */
export function validateAuthEnvironment(): void {
	const requiredEnvVars = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];

	const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

	if (missing.length > 0) {
		const message = `Variables d'environnement manquantes pour l'authentification: ${missing.join(", ")}`;

		if (process.env.NODE_ENV === "production") {
			throw new Error(message);
		}

		// Warning en dev/test pour detecter les problemes tot
		logger.warn(message, { service: "auth-env" });
	}
}
