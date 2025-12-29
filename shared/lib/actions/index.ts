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

// Authentication helpers - MOVED to @/modules/auth/lib/require-auth
// Import directly: import { requireAuth, requireAdmin, requireAdminWithUser } from "@/modules/auth/lib/require-auth"

// Validation helpers
export { validateInput, validateFormData } from "./validation";

// Rate limiting helpers
// NOTE: enforceRateLimit est la seule fonction native de shared/
// Pour getRateLimitId et enforceRateLimitForCurrentUser, importer depuis @/modules/auth/lib/rate-limit-helpers
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
	validationError,
} from "./responses";
