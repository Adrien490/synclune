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

// Authentication helpers - import directly:
// import { requireAdmin } from "@/modules/admin-auth/lib/require-admin"

// Validation helpers
export { validateInput, safeFormGet, safeFormGetJSON, parseFormIds } from "./validation";

// Plus de rate limiting : perte volontaire du schéma lean (§ 1, lot 2).

// Error handling helpers
export { handleActionError, isUniqueConstraintError, BusinessError } from "./errors";

// Response helpers
export {
	success,
	error,
	notFound,
	unauthorized,
	forbidden,
	conflict,
	validationError,
} from "./responses";

// Re-export ActionStatus for convenience
export { ActionStatus } from "@/shared/types/server-action";
