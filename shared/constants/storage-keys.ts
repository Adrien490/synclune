/**
 * Storage keys - Centralized localStorage/sessionStorage keys
 * Used across the application for consistent storage access
 */

// ============================================================================
// LOCALSTORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
	/**
	 * Tracks if user has seen the long-press hint for media reordering
	 * Used in: modules/media/components/admin/media-upload-grid.tsx
	 */
	MEDIA_UPLOAD_HINT_SEEN: "media-upload-hint-seen",

	/**
	 * Stores checkout form draft for recovery
	 * Used in: modules/payments/components/checkout-form.tsx
	 *          modules/payments/utils/checkout-form.utils.ts
	 */
	CHECKOUT_FORM_DRAFT: "checkout-form-draft",

	/**
	 * Prefix for cooldown expiry timestamp for resend verification email
	 * Full key format: `${RESEND_VERIFICATION_COOLDOWN_PREFIX}${email}`
	 * Used in: modules/users/components/resend-verification-button.tsx
	 */
	RESEND_VERIFICATION_COOLDOWN_PREFIX: "resend-cooldown-",
} as const;

/**
 * Helper to build the resend verification cooldown key
 */
export function getResendVerificationCooldownKey(email: string): string {
	return `${STORAGE_KEYS.RESEND_VERIFICATION_COOLDOWN_PREFIX}${email}`;
}

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
