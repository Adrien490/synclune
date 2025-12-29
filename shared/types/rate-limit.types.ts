/**
 * Types pour le rate limiting
 */

export interface RateLimitConfig {
	/**
	 * Nombre maximum de requêtes autorisées dans la fenêtre
	 * @default 10
	 */
	limit?: number

	/**
	 * Durée de la fenêtre en millisecondes
	 * @default 60000 (1 minute)
	 */
	windowMs?: number
}

export interface RateLimitResult {
	/**
	 * Indique si la requête est autorisée
	 */
	success: boolean

	/**
	 * Nombre de requêtes restantes dans la fenêtre
	 */
	remaining: number

	/**
	 * Nombre total de requêtes autorisées
	 */
	limit: number

	/**
	 * Timestamp (ms) de réinitialisation du compteur
	 */
	reset: number

	/**
	 * Nombre de secondes avant de pouvoir réessayer (si bloqué)
	 */
	retryAfter?: number

	/**
	 * Message d'erreur si rate limit dépassé
	 */
	error?: string
}
