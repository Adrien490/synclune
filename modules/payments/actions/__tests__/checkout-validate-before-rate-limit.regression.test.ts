/**
 * @regression checkout-validate-before-rate-limit
 *
 * `confirmCheckout` doit PARSER son argument avant d'en dériver quoi que ce soit.
 *
 * ⚠️ L'identifiant de rate limit vaut `checkout-confirm:guest:<email>:<ip>` et était
 * construit à partir de `data.email` — c'est-à-dire d'une valeur brute, une dizaine
 * de lignes AVANT le `safeParse`. Deux conséquences :
 *
 *  1. le budget `CREATE_SESSION` (propre à la confirmation depuis F3) ne tenait plus :
 *     un invité qui variait son email à chaque requête ouvrait un compteur neuf à
 *     chaque fois, et une charge de payloads invalides consommait quand même des
 *     entrées du `Map` in-memory ;
 *  2. un `email` non-string faisait throw `normalizeEmail` (`email.trim()`) avant
 *     toute garde métier.
 *
 * Le type `data: ConfirmCheckoutData` masquait le problème au type-checker — à une
 * frontière RPC, seul le parse fait foi. Les deux actions sœurs (`initializePayment`,
 * `updatePaymentAmount`) déclarent `unknown` et parsent en tête ; celle-ci ne le
 * faisait pas.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkRateLimit: vi.fn(),
	getClientIp: vi.fn(),
	getSession: vi.fn(),
	getOrCreateCartSessionId: vi.fn(),
	assertStoreOpen: vi.fn(),
	isVerifiedAdmin: vi.fn(),
	requireActiveAccountIfAuthenticated: vi.fn(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mocks.checkRateLimit,
	getClientIp: mocks.getClientIp,
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({ getSession: mocks.getSession }));
vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mocks.getOrCreateCartSessionId,
}));
vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mocks.assertStoreOpen,
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	isVerifiedAdmin: mocks.isVerifiedAdmin,
	requireActiveAccountIfAuthenticated: mocks.requireActiveAccountIfAuthenticated,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: { order: { findUnique: vi.fn() } } }));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { paymentIntents: { retrieve: vi.fn(), update: vi.fn() } },
	withStripeCircuitBreaker: vi.fn((fn: () => unknown) => fn()),
	CircuitBreakerError: class extends Error {},
}));
vi.mock("next/headers", () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({
	startSpan: (_o: unknown, fn: (span: unknown) => unknown) => fn({ setAttribute: vi.fn() }),
	captureException: vi.fn(),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { confirmCheckout } from "../confirm-checkout";

/** Payload structurellement invalide (panier vide) — rejeté par `confirmCheckoutSchema`. */
const invalidPayload = (email: unknown) => ({
	cartItems: [],
	shippingAddress: {
		fullName: "Léane Dupont",
		addressLine1: "1 rue des Fleurs",
		city: "Angers",
		postalCode: "49000",
		country: "FR",
		phoneNumber: "+33612345678",
	},
	email,
	paymentIntentId: "pi_test_123",
});

describe("@regression confirmCheckout — parse AVANT dérivation du rate limit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSession.mockResolvedValue(null);
		mocks.getOrCreateCartSessionId.mockResolvedValue("guest-session-1");
		mocks.getClientIp.mockResolvedValue("203.0.113.7");
		mocks.assertStoreOpen.mockResolvedValue(null);
		mocks.isVerifiedAdmin.mockResolvedValue(false);
		mocks.requireActiveAccountIfAuthenticated.mockResolvedValue({});
		mocks.checkRateLimit.mockResolvedValue({ success: true });
	});

	it("ne consomme AUCUN jeton de rate limit sur un payload invalide", async () => {
		const result = await confirmCheckout(invalidPayload("leane@example.com"));

		expect(result.success).toBe(false);
		// Le cœur de la régression : la clé était construite — donc le compteur
		// incrémenté — avant même de savoir si le payload tenait debout.
		expect(mocks.checkRateLimit).not.toHaveBeenCalled();
	});

	it("ne throw pas sur un `email` non-string (le type n'est pas une garantie ici)", async () => {
		// `normalizeEmail(email)` faisait `email.trim()` → TypeError avant toute garde.
		for (const hostileEmail of [42, { toString: () => "x" }, ["a@b.co"], true]) {
			const result = await confirmCheckout(invalidPayload(hostileEmail));
			expect(result.success).toBe(false);
		}
		expect(mocks.checkRateLimit).not.toHaveBeenCalled();
	});

	it("rejette un argument qui n'est même pas un objet", async () => {
		for (const garbage of [null, undefined, "nope", 0, []]) {
			const result = await confirmCheckout(garbage);
			expect(result.success).toBe(false);
		}
		expect(mocks.checkRateLimit).not.toHaveBeenCalled();
	});
});
