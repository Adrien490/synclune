import { describe, expect, it } from "vitest";

import { isApiPath, isSensitiveNavigationPath, isStripeHost } from "./sw-routing";

/**
 * @regression pwa-audit-cache-safety-2026-05-28
 *
 * Locks the service-worker cache-safety invariants from the 2026-05-28 PWA audit.
 * If a future edit makes admin/order/auth API or checkout navigations cacheable,
 * these tests must fail loudly.
 */
describe("sw-routing — cache safety predicates", () => {
	describe("isStripeHost (PWA-AUDIT-009 — Stripe must never be cached)", () => {
		it("matches Stripe.js and Stripe API hosts", () => {
			expect(isStripeHost("js.stripe.com")).toBe(true);
			expect(isStripeHost("api.stripe.com")).toBe(true);
			expect(isStripeHost("m.stripe.com")).toBe(true);
			expect(isStripeHost("stripe.com")).toBe(true);
		});

		it("does not match look-alike or unrelated hosts", () => {
			expect(isStripeHost("stripe.com.evil.example")).toBe(false);
			expect(isStripeHost("notstripe.com")).toBe(false);
			expect(isStripeHost("synclune.fr")).toBe(false);
			expect(isStripeHost("utfs.io")).toBe(false);
		});
	});

	describe("isApiPath (PWA-AUDIT-001 — no API response cached)", () => {
		it("matches every sensitive API route audited", () => {
			expect(isApiPath("/api/admin/orders/export")).toBe(true);
			expect(isApiPath("/api/orders/SYN-123/invoice")).toBe(true);
			expect(isApiPath("/api/orders/SYN-123/credit-note")).toBe(true);
			expect(isApiPath("/api/orders/SYN-123/status")).toBe(true);
			expect(isApiPath("/api/auth/session")).toBe(true);
		});

		it("does not match non-API paths", () => {
			expect(isApiPath("/creations/collier-lune")).toBe(false);
			expect(isApiPath("/")).toBe(false);
			expect(isApiPath("/apicabar")).toBe(false); // not under /api/
		});
	});

	describe("isSensitiveNavigationPath (PWA-AUDIT-003/004 — checkout & admin never cached)", () => {
		it("matches checkout and admin navigations", () => {
			expect(isSensitiveNavigationPath("/paiement")).toBe(true);
			expect(isSensitiveNavigationPath("/paiement/confirmation")).toBe(true);
			expect(isSensitiveNavigationPath("/paiement/annulation")).toBe(true);
			expect(isSensitiveNavigationPath("/admin")).toBe(true);
			expect(isSensitiveNavigationPath("/admin/ventes/commandes")).toBe(true);
		});

		it("does not match storefront navigations that may be cached", () => {
			expect(isSensitiveNavigationPath("/")).toBe(false);
			expect(isSensitiveNavigationPath("/creations/collier-lune")).toBe(false);
			expect(isSensitiveNavigationPath("/collections")).toBe(false);
		});
	});
});
