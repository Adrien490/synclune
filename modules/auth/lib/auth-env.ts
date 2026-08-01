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
	/**
	 * Cache cookie de session : tant qu'il est valide, `auth.api.getSession()`
	 * répond depuis le cookie signé **sans aucune lecture en base** — le plugin
	 * `customSession` (celui qui dégrade le rôle à `USER` pour un compte révoqué)
	 * ne s'exécute même pas.
	 *
	 * ⚠️ C'est donc `maxAge` — et rien d'autre — qui fixe la latence de révocation
	 * de toute l'application. Supprimer les lignes `Session` en base ne coupe rien
	 * avant son expiration.
	 *
	 * **60 s et non 300 s** (audit « Admin role & re-check DB », 2026-07-31) : à
	 * 5 min, le bouton « Déconnecter tous mes appareils » laissait un attaquant
	 * disposant d'une session volée garder l'accès admin cinq minutes après le
	 * clic. Le coût est négligeable ici — une seule opératrice, et **zéro impact
	 * sur le trafic invité** (pas de cookie de session ⇒ pas de requête du tout).
	 */
	cookieCache: {
		enabled: true,
		maxAge: 60,
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
	// ⚠️ `/verify-email` est le point de CONSOMMATION du lien, pas celui d'ENVOI.
	// Sans la règle ci-dessous, `/send-verification-email` retombait sur le global
	// Better Auth (100/60 s), soit 33× plus permissif que son voisin
	// `/forget-password` — et l'API brute court-circuite le compteur par email-cible
	// de `resend-verification-email.ts`. Audit rate limiting 2026-07-31.
	"/send-verification-email": {
		window: 60,
		max: 3,
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
