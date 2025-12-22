/**
 * Helpers pour Server Actions
 *
 * Point d'entrée centralisé pour tous les utilitaires destinés aux Server Actions.
 * Ces helpers simplifient l'écriture des actions en fournissant des patterns réutilisables.
 *
 * @example
 * ```ts
 * import {
 *   requireAuth,
 *   validateInput,
 *   enforceRateLimitForCurrentUser,
 *   success,
 *   handleActionError
 * } from "@/shared/lib/actions"
 * ```
 */

// Authentication helpers
export { requireAuth, requireAdmin } from "./auth";

// Validation helpers
export { validateInput, validateFormData } from "./validation";

// Rate limiting helpers
export {
	enforceRateLimit,
	getRateLimitId,
	enforceRateLimitForCurrentUser,
} from "./rate-limit";

// Error handling helpers
export { handleActionError } from "./errors";

// Response helpers
export {
	success,
	error,
	notFound,
	unauthorized,
	forbidden,
	validationError,
} from "./responses";
