/**
 * Normalizes an email address for storage and comparison.
 *
 * Trim + lowercase only — does NOT strip dot-aliases (e.g. `john.doe@gmail.com`
 * vs `johndoe@gmail.com` are kept distinct), nor `+suffix` aliases. Provider-specific
 * canonicalization is out of scope.
 *
 * Used by:
 * - `confirm-checkout` before passing to `createOrderInTransaction` so
 *   `Order.customerEmail` is stored consistently.
 * - `validate-discount-code` before `getDiscountUsageCounts` so the guest
 *   per-user limit can't be trivially bypassed via casing/whitespace
 *   (cf [[CHECKOUT-AUDIT-003]]).
 * - Any other server-side guest-email key (Stripe customer idempotency, rate
 *   limit identifier, etc.).
 */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}
