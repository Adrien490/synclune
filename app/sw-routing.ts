/**
 * Pure routing predicates for the service worker runtime caching strategy.
 *
 * Extracted from `app/sw.ts` so the cache-safety invariants stay unit-testable
 * without importing the worker-only Serwist modules (which require a
 * ServiceWorkerGlobalScope). See `app/sw-routing.test.ts`.
 *
 * Invariants enforced here (PWA audit 2026-05-28):
 * - PWA-AUDIT-001 — no API response is ever written to Cache Storage.
 * - PWA-AUDIT-003/004 — checkout (`/paiement`) and admin (`/admin`) navigations
 *   are never cached (stale data / expired PaymentIntent / authenticated HTML at rest).
 * - PWA-AUDIT-009 — Stripe.js / Stripe API are never cached (caching breaks payments).
 */

/**
 * Stripe.js (`js.stripe.com`) and the Stripe API (`*.stripe.com`) MUST always be
 * fetched live (NetworkOnly). Caching Stripe.js is forbidden by Stripe and a stale
 * copy silently breaks the payment form.
 */
export function isStripeHost(hostname: string): boolean {
	return (
		hostname === "stripe.com" || hostname === "js.stripe.com" || hostname.endsWith(".stripe.com")
	);
}

/**
 * Same-origin navigations that must never be cached: the admin dashboard and the
 * whole checkout flow. Prevents serving a stale admin view or a stale checkout page
 * (expired PaymentIntent `clientSecret`), and avoids persisting authenticated
 * HTML/RSC to disk on shared devices.
 */
export function isSensitiveNavigationPath(pathname: string): boolean {
	return pathname.startsWith("/admin") || pathname.startsWith("/paiement");
}

/**
 * Any same-origin API route. All API responses are served NetworkOnly so that
 * authenticated / sensitive payloads (admin orders export, invoice & credit-note
 * PDFs, order status, auth session — several explicitly `Cache-Control: no-store`)
 * are never written to Cache Storage.
 */
export function isApiPath(pathname: string): boolean {
	return pathname.startsWith("/api/");
}
