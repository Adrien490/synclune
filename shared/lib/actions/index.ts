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

// Rate limiting helpers
// NOTE: enforceRateLimit est la seule fonction native de shared/
// Pour getRateLimitId et enforceRateLimitForCurrentUser, importer depuis @/modules/admin-auth/lib/rate-limit-helpers
export { enforceRateLimit } from "./rate-limit";

// Error handling helpers
export { handleActionError, BusinessError } from "./errors";

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
