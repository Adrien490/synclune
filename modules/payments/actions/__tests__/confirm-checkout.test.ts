import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaClientKnownRequestError,
	mockPrisma,
	mockGetSession,
	mockGetOrCreateGuestSessionId,
	mockGetCart,
	mockUpdatePendingShippingSnapshot,
	mockGetOrderMetadataInvalidationTags,
	mockGetCartInvalidationTags,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockUpdateTag,
	mockGetSkuDetails,
	mockEnrichStripeCustomer,
	mockAfter,
	mockCreateOrderInTransaction,
	mockComputeCartSubtotal,
	mockStripe,
	mockCircuitBreakerErrorClass,
	mockSentryStartSpan,
	mockSentryCaptureException,
	mockSentryWithScope,
	mockSentryCaptureMessage,
	mockRequireActiveAccount,
	mockIsVerifiedAdmin,
} = vi.hoisted(() => {
	const CircuitBreakerErrorClass = class CircuitBreakerError extends Error {
		constructor(name: string) {
			super(`Circuit breaker OPEN for ${name}`);
			this.name = "CircuitBreakerError";
		}
	};

	// Subclass réelle obligatoire (convention projet) : un Object.assign(new Error(),
	// { code }) n'est pas instanceof PrismaClientKnownRequestError → faux vert.
	const MockPrismaClientKnownRequestError = class PrismaClientKnownRequestError extends Error {
		code: string;
		constructor(message: string, code: string) {
			super(message);
			this.name = "PrismaClientKnownRequestError";
			this.code = code;
		}
	};

	return {
		mockPrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
		mockPrisma: {
			$queryRaw: vi.fn(),
			order: {
				findUnique: vi.fn(),
				delete: vi.fn(),
				// Claim de libération du code promo (audit V2, Lot 2).
				updateMany: vi.fn(),
			},
			user: {
				findUnique: vi.fn(),
				updateMany: vi.fn(),
			},
			discount: {
				updateMany: vi.fn(),
			},
			address: {
				count: vi.fn(),
				create: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockGetSession: vi.fn(),
		mockGetOrCreateGuestSessionId: vi.fn(),
		mockGetCart: vi.fn(),
		mockUpdatePendingShippingSnapshot: vi.fn(),
		mockGetOrderMetadataInvalidationTags: vi.fn(),
		mockGetCartInvalidationTags: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockGetRateLimitIdentifier: vi.fn(),
		mockHeaders: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockGetSkuDetails: vi.fn(),
		mockEnrichStripeCustomer: vi.fn(),
		mockAfter: vi.fn(),
		mockCreateOrderInTransaction: vi.fn(),
		mockComputeCartSubtotal: vi.fn(),
		mockStripe: {
			paymentIntents: {
				retrieve: vi.fn(),
				update: vi.fn(),
			},
		},
		mockCircuitBreakerErrorClass: CircuitBreakerErrorClass,
		mockSentryStartSpan: vi.fn(),
		mockSentryCaptureException: vi.fn(),
		mockSentryWithScope: vi.fn(),
		mockSentryCaptureMessage: vi.fn(),
		mockRequireActiveAccount: vi.fn(),
		mockIsVerifiedAdmin: vi.fn(),
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

// confirm-checkout importe { Prisma } pour l'instanceof P2002 (CHECKOUT-IDEM-002).
// Les autres imports du client généré dans le graphe sont type-only (érasés).
vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { PrismaClientKnownRequestError: mockPrismaClientKnownRequestError },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/guest-session", () => ({
	getOrCreateGuestSessionId: mockGetOrCreateGuestSessionId,
}));

// CHECKOUT-CART-PARITY-001 : les lignes facturées sont confrontées au panier serveur.
vi.mock("@/modules/cart/data/get-cart", () => ({
	getCart: mockGetCart,
}));

// KI-001 : correction du snapshot d'adresse d'une commande encore PENDING.
vi.mock("@/modules/orders/services/update-pending-order-shipping-snapshot.service", () => ({
	updatePendingOrderShippingSnapshot: mockUpdatePendingShippingSnapshot,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { CREATE_SESSION: "create-session" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));

vi.mock("@/modules/payments/services/stripe-customer.service", () => ({
	enrichStripeCustomer: mockEnrichStripeCustomer,
}));

vi.mock("next/server", () => ({
	after: mockAfter,
}));

// AUTHZ-1 gate (require-auth) — authorise par défaut (compte ACTIF / invité).
// isVerifiedAdmin gate le bypass "boutique fermée" pour les tests admin (défaut
// false — le rôle admin n'est vérifié qu'explicitement par les tests concernés).
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireActiveAccountIfAuthenticated: mockRequireActiveAccount,
	isVerifiedAdmin: mockIsVerifiedAdmin,
}));

vi.mock("@/modules/payments/services/order-creation.service", () => ({
	createOrderInTransaction: mockCreateOrderInTransaction,
}));

vi.mock("@/modules/payments/services/checkout-subtotal.service", () => ({
	computeCartSubtotal: mockComputeCartSubtotal,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
	CircuitBreakerError: mockCircuitBreakerErrorClass,
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE: (id: string) => `discount-usage-${id}` },
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: (text: string) => text,
}));

const { mockLoggerError, mockLoggerInfo, mockLoggerWarn, mockAssertStoreOpen } = vi.hoisted(() => ({
	mockLoggerError: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerWarn: vi.fn(),
	mockAssertStoreOpen: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: mockLoggerError,
		info: mockLoggerInfo,
		warn: mockLoggerWarn,
	},
}));

vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	captureException: mockSentryCaptureException,
	withScope: mockSentryWithScope,
	captureMessage: mockSentryCaptureMessage,
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "BE", "DE", "LU", "CH"],
	COUNTRY_ERROR_MESSAGE: "Pays non supporté",
}));

vi.mock("@/shared/schemas/email.schemas", async () => {
	const { z } = await import("zod");
	return {
		emailOptionalSchema: z.string().email().optional(),
	};
});

vi.mock("@/shared/schemas/phone.schemas", async () => {
	const { z } = await import("zod");
	return {
		phoneSchema: z.string().min(1),
	};
});

vi.mock("@/modules/cart/constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
	MAX_CART_ITEMS: 50,
}));

vi.mock("@/modules/discounts/schemas/discount.schemas", async () => {
	const { z } = await import("zod");
	return {
		discountCodeSchema: z.string().min(1),
	};
});

vi.mock("@/modules/payments/utils/parse-full-name", () => ({
	parseFullName: (fullName: string) => {
		const parts = fullName.trim().split(" ");
		const firstName = parts[0] ?? "";
		const lastName = parts.slice(1).join(" ");
		return { firstName, lastName };
	},
}));

// ============================================================================
// IMPORT UNDER TEST — after all mocks
// ============================================================================

import { confirmCheckout } from "../confirm-checkout";
import type { ConfirmCheckoutData } from "../../schemas/checkout.schema";
import StripeModule from "stripe";
import { BusinessError } from "@/shared/lib/actions";

// ============================================================================
// TEST DATA
// ============================================================================

// skuId au format cuid réel (F2 audit Zod : cartItemSchema.skuId = z.cuid2())
const VALID_SKU_ID = "cm3sku00000001qz8v4h2j9d3";
const VALID_SKU_ID_2 = "cm3sku00000002qz8v4h2j9d3";

const VALID_CART_ITEMS = [{ skuId: VALID_SKU_ID, quantity: 1, priceAtAdd: 4500 }];

const VALID_SHIPPING_ADDRESS = {
	fullName: "Marie Dupont",
	addressLine1: "12 Rue de la Paix",
	addressLine2: "",
	city: "Paris",
	postalCode: "75001",
	country: "FR" as const,
	phoneNumber: "+33612345678",
};

function createValidData(overrides: Partial<ConfirmCheckoutData> = {}): ConfirmCheckoutData {
	return {
		cartItems: VALID_CART_ITEMS,
		shippingAddress: VALID_SHIPPING_ADDRESS,
		email: undefined,
		paymentIntentId: "pi_test_123",
		...overrides,
	};
}

/**
 * Commande déjà liée au PaymentIntent, telle que la lit le pre-check idempotent.
 * Par défaut cohérente avec `createValidData()` → hit idempotent accepté ;
 * les tests de divergence (CHECKOUT-CONSENT-001) surchargent un champ.
 */
function createBoundOrder(
	overrides: Partial<{
		id: string;
		orderNumber: string;
		total: number;
		userId: string | null;
		shippingCountry: string;
		shippingPostalCode: string;
		customerEmail: string;
		items: Array<{ skuId: string; quantity: number }>;
	}> = {},
) {
	return {
		id: "order-existing",
		orderNumber: "SYN-20260301-XXXX",
		total: 4990,
		userId: "cm3user0000123qz8v4h2j9d3",
		shippingCountry: VALID_SHIPPING_ADDRESS.country,
		shippingPostalCode: VALID_SHIPPING_ADDRESS.postalCode,
		// Repli quand la resoumission n'apporte aucun email — sans lui, la correction
		// d'identité écrirait `undefined` dans une colonne NOT NULL.
		customerEmail: "cliente@example.com",
		items: VALID_CART_ITEMS.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
		...overrides,
	};
}

const MOCK_SKU_RESULT = {
	success: true as const,
	data: {
		sku: {
			id: VALID_SKU_ID,
			priceInclTax: 4500,
			size: null,
			material: null,
			color: null,
			compareAtPrice: null,
			images: [{ url: "https://utfs.io/f/image.jpg", mediaType: "IMAGE" }],
			product: {
				id: "prod-001",
				title: "Bague Lune",
				description: "Belle bague artisanale",
			},
		},
	},
};

const MOCK_ORDER = {
	id: "order-001",
	orderNumber: "SYN-20260310-A1B2",
	total: 5090,
};

const MOCK_ORDER_RESULT = {
	order: MOCK_ORDER,
	appliedDiscountId: null,
};

const MOCK_PAYMENT_INTENT = {
	id: "pi_test_123",
	status: "requires_confirmation",
	amount: 4500,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Aligne le panier SERVEUR sur les lignes passées à l'action.
 *
 * Nécessaire dès qu'un test soumet autre chose que `VALID_CART_ITEMS` : la garde de
 * parité (CHECKOUT-CART-PARITY-001) refuse toute divergence `skuId:quantity` entre
 * les lignes du client et le panier serveur.
 */
function setServerCart(items: Array<{ skuId: string; quantity: number }>) {
	mockGetCart.mockResolvedValue({
		items: items.map((item) => ({ sku: { id: item.skuId }, quantity: item.quantity })),
	});
}

function setupDefaults() {
	// Sentry: execute the callback directly
	mockSentryStartSpan.mockImplementation((_opts: unknown, fn: (span: unknown) => unknown) =>
		fn({
			setAttribute: vi.fn(),
		}),
	);
	// Sentry.withScope: run the callback with a stub scope so cleanupFailedCheckout's
	// anti-race alert (ORD-STRIPE-004) can execute without throwing.
	mockSentryWithScope.mockImplementation((fn: (scope: unknown) => unknown) =>
		fn({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setFingerprint: vi.fn(),
			setContext: vi.fn(),
		}),
	);

	// Auth: authenticated user
	mockGetSession.mockResolvedValue({
		user: { id: "cm3user0000123qz8v4h2j9d3", email: "marie@example.com" },
	});

	// AUTHZ-1 gate: account active by default
	mockRequireActiveAccount.mockResolvedValue({ ok: true });

	// isVerifiedAdmin: non-admin by default (store-open guard runs normally).
	mockIsVerifiedAdmin.mockResolvedValue(false);

	// DB: user has no existing Stripe customer
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });

	// DB: no existing order for this PI (idempotence check)
	mockPrisma.order.findUnique.mockResolvedValue(null);

	// Rate limit
	mockHeaders.mockResolvedValue(new Headers({ "user-agent": "vitest/1.0" }));
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue("user:cm3user0000123qz8v4h2j9d3");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	// SKU details
	mockGetSkuDetails.mockResolvedValue(MOCK_SKU_RESULT);

	// Stripe customer enrichment (best-effort, deferred via after())
	mockEnrichStripeCustomer.mockResolvedValue(undefined);
	mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
	// Execute after() callbacks immediately so deferred work is observable in tests.
	mockAfter.mockImplementation((cb: () => Promise<void> | void) => {
		void Promise.resolve(cb());
	});

	// Sous-total au prix DB
	mockComputeCartSubtotal.mockReturnValue(4500);

	// Order creation
	mockCreateOrderInTransaction.mockResolvedValue(MOCK_ORDER_RESULT);

	// Stripe PI retrieve (modifiable state).
	// CHECKOUT-IDOR-001 : la metadata d'ownership est dérivée de la session
	// courante au moment de l'appel, pour que les blocs guest/authentifié n'aient
	// pas à la redéclarer. Les tests d'ownership la surchargent explicitement.
	mockStripe.paymentIntents.retrieve.mockImplementation(async () => {
		const session = (await mockGetSession()) as { user?: { id?: string } } | null;
		const sessionUserId = session?.user?.id ?? null;
		const guestSessionId = sessionUserId ? null : await mockGetOrCreateGuestSessionId();
		return {
			...MOCK_PAYMENT_INTENT,
			metadata: {
				userId: sessionUserId ?? "guest",
				...(guestSessionId ? { guestSessionId } : {}),
			},
		};
	});

	// Stripe PI update — returns the PI with its attached customer (set at init)
	mockStripe.paymentIntents.update.mockResolvedValue({
		...MOCK_PAYMENT_INTENT,
		amount: 5090,
		customer: "cus_init_001",
	});

	// Cart cache
	mockGetCartInvalidationTags.mockReturnValue(["cart-user-cm3user0000123qz8v4h2j9d3"]);
	mockUpdatePendingShippingSnapshot.mockResolvedValue({ updated: false, reason: "no-change" });
	mockGetOrderMetadataInvalidationTags.mockReturnValue(["order-meta-order-existing"]);
	// Panier serveur aligné sur VALID_CART_ITEMS — la garde de parité
	// (CHECKOUT-CART-PARITY-001) compare `skuId:quantity`, jamais les prix.
	mockGetCart.mockResolvedValue({
		items: VALID_CART_ITEMS.map((item) => ({
			sku: { id: item.skuId },
			quantity: item.quantity,
		})),
	});

	// Cleanup transaction (for failed checkout tests)
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
	);
	// Advisory lock order-paid (acquireOrderPaidLockTx) pris dans la tx de cleanup.
	mockPrisma.$queryRaw.mockResolvedValue([]);
	mockPrisma.order.delete.mockResolvedValue({});
	mockPrisma.discount.updateMany.mockResolvedValue({ count: 1 });
	// [[DISC-USAGE-002]] `cleanupFailedCheckout` libère via
	// `releaseOrderDiscountUsageTx`, qui CLAIME les colonnes `discountId`/`discountCode`
	// d'`Order` (audit V2, Lot 2 — le code promo n'est plus une table de liaison).
	mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
}

// Chorégraphie des order.findUnique pour les tests exerçant cleanupFailedCheckout :
// 1er appel = idempotence step 3b (null), 2e = pre-check fast-path ORD-STRIPE-004,
// 3e = re-check SOUS l'advisory lock dans la tx (CHECKOUT-RACE-004). Sans ce helper,
// le re-check in-tx lit le défaut null → cleanup traite la commande comme déjà
// supprimée et ne delete rien.
//
// Le 4e appel — `releaseOrderDiscountUsageTx` lisant `discountId` (audit V2, Lot 2) —
// tombe volontairement sur la valeur de BASE, pas sur la chaîne de `Once` : les tests
// « sans remise » gardent `discountId: null`, ceux qui exercent le rollback la
// surchargent. Allonger la chaîne aurait couplé chaque test au nombre exact de reads.
function setupCleanupOrderState(
	inTxState: { paymentStatus: string; stripePaymentIntentId: string } | null = {
		paymentStatus: "PENDING",
		stripePaymentIntentId: "pi_test_123",
	},
	/** Ce que lit `releaseOrderDiscountUsageTx` — `null` = commande sans code promo. */
	releasedDiscountId: string | null = null,
) {
	mockPrisma.order.findUnique
		.mockResolvedValue({ discountId: releasedDiscountId })
		.mockResolvedValueOnce(null)
		.mockResolvedValueOnce({ paymentStatus: "PENDING", stripePaymentIntentId: "pi_test_123" })
		.mockResolvedValueOnce(inTxState);
}

// ============================================================================
// TESTS
// ============================================================================

describe("confirmCheckout", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — authenticated user
	// ──────────────────────────────────────────────────────────────

	// AM-3 : la garde compte-actif (AUTHZ-1) est rejouée dans confirmCheckout, pas
	// seulement dans initializePayment — un compte suspendu entre le montage de la
	// page et le clic Payer ne doit pas pouvoir faire créer une commande payée.
	describe("AUTHZ-1 account-active gate (AM-3)", () => {
		it("rejects a non-active account and never creates an order", async () => {
			mockRequireActiveAccount.mockResolvedValue({
				error: { message: "Votre compte n'est pas autorisé à effectuer cette action." },
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Votre compte n'est pas autorisé à effectuer cette action.",
			});
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});
	});

	describe("happy path (authenticated user)", () => {
		it("should return success with orderId, orderNumber, and finalAmount", async () => {
			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: true,
				orderId: "order-001",
				orderNumber: "SYN-20260310-A1B2",
				finalAmount: 5090,
			});
		});

		it("should enrich the PI's Stripe customer with the real billing identity", async () => {
			await confirmCheckout(createValidData());

			await vi.waitFor(() => {
				expect(mockEnrichStripeCustomer).toHaveBeenCalledWith(
					"cus_init_001",
					expect.objectContaining({
						name: "Marie Dupont",
						address: VALID_SHIPPING_ADDRESS,
						phoneNumber: "+33612345678",
					}),
				);
			});
		});

		it("should never write on User post-confirm (User.stripeCustomerId dropped, Lot 0 S1.1)", async () => {
			await confirmCheckout(createValidData());

			expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
		});

		it("should not enrich when the PI carries no customer", async () => {
			mockStripe.paymentIntents.update.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				amount: 5090,
				customer: null,
			});

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(true);
			expect(mockEnrichStripeCustomer).not.toHaveBeenCalled();
			expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
		});

		it("should use session email when no email provided in data", async () => {
			await confirmCheckout(createValidData({ email: undefined }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ finalEmail: "marie@example.com" }),
			);
		});

		it("should update Stripe PI with order metadata after order creation", async () => {
			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith(
				"pi_test_123",
				expect.objectContaining({
					amount: 5090,
					receipt_email: "marie@example.com",
					metadata: expect.objectContaining({
						orderId: "order-001",
						orderNumber: "SYN-20260310-A1B2",
						userId: "cm3user0000123qz8v4h2j9d3",
					}),
				}),
			);
		});

		/**
		 * Depuis le passage du panier en cookie (2026-08-04), le panier n'a plus
		 * d'entrée de cache par identité : il n'y a plus rien à invalider ici. Le
		 * vidage lui-même a lieu sur `/paiement/confirmation` (`clearCartAfterOrder`)
		 * — surtout PAS ici, car `confirmCheckout` s'exécute AVANT la confirmation
		 * Stripe : vider à ce point priverait de son panier un client dont la carte
		 * est refusée.
		 */
		it("n'invalide plus aucun tag de cache panier", async () => {
			await confirmCheckout(createValidData());

			expect(mockUpdateTag).not.toHaveBeenCalledWith(expect.stringContaining("cart-user-"));
			expect(mockUpdateTag).not.toHaveBeenCalledWith(expect.stringContaining("cart-session-"));
		});

		it("should call computeCartSubtotal with cart items and SKU results", async () => {
			await confirmCheckout(createValidData());

			expect(mockComputeCartSubtotal).toHaveBeenCalledWith(VALID_CART_ITEMS, [MOCK_SKU_RESULT]);
		});

		it("should call createOrderInTransaction with all required params", async () => {
			await confirmCheckout(createValidData({ paymentIntentId: "pi_test_123" }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					cartItems: VALID_CART_ITEMS,
					subtotal: 4500,
					firstName: "Marie",
					lastName: "Dupont",
					// Plus de `userId` : `Order.userId` est parti le 2026-08-05 (achat
					// 100 % invité). Le `userId` de SESSION reste, lui, dans les
					// métadonnées du PaymentIntent — c'est la garde CHECKOUT-IDOR-001,
					// asserted juste au-dessus.
					finalEmail: "marie@example.com",
					paymentIntentId: "pi_test_123",
				}),
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Happy path — guest user
	// ──────────────────────────────────────────────────────────────

	describe("happy path (guest user)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateGuestSessionId.mockResolvedValue("550e8400-e29b-41d4-a716-446655440000");
			mockGetRateLimitIdentifier.mockReturnValue("session:550e8400-e29b-41d4-a716-446655440000");
		});

		it("should return success for guest with explicit email", async () => {
			const result = await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(result).toEqual({
				success: true,
				orderId: "order-001",
				orderNumber: "SYN-20260310-A1B2",
				finalAmount: 5090,
			});
		});

		it("should not look up user in DB for guest", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
		});

		it("should enrich the customer but never backfill a User for guests", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			await vi.waitFor(() => {
				expect(mockEnrichStripeCustomer).toHaveBeenCalledWith("cus_init_001", expect.any(Object));
			});
			expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
		});

		it("should call getOrCreateGuestSessionId for guest rate limiting", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockGetOrCreateGuestSessionId).toHaveBeenCalled();
		});

		it("should include guestSessionId in PI metadata for guest", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith(
				"pi_test_123",
				expect.objectContaining({
					metadata: expect.objectContaining({
						userId: "guest",
						guestSessionId: "550e8400-e29b-41d4-a716-446655440000",
					}),
				}),
			);
		});

		it("should use guest email for order creation", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ finalEmail: "guest@example.com" }),
			);
		});

		it("n'invalide plus aucun tag de cache panier pour un invité non plus", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockUpdateTag).not.toHaveBeenCalledWith(expect.stringContaining("cart-session-"));
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Idempotence
	// ──────────────────────────────────────────────────────────────

	// ──────────────────────────────────────────────────────────────
	// CHECKOUT-CART-PARITY-001 — parité avec le panier serveur
	// ──────────────────────────────────────────────────────────────

	describe("parité du panier client / serveur", () => {
		it("refuse une soumission dont les quantités divergent du panier serveur", async () => {
			// Le cas deux onglets : l'onglet A a été rendu avec quantité 1, l'onglet B l'a
			// passée à 2. `updatePaymentAmount` posait le montant du panier SERVEUR sur le PI
			// pendant que `confirmCheckout` facturait celui de l'onglet A.
			setServerCart([{ skuId: VALID_SKU_ID, quantity: 5 }]);

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(false);
			expect((result as { error: string }).error).toMatch(/panier a changé/i);
			// Fail-closed AVANT toute création de commande ou appel Stripe.
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("refuse une ligne absente du panier serveur", async () => {
			setServerCart([{ skuId: VALID_SKU_ID_2, quantity: 1 }]);

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(false);
			expect((result as { error: string }).error).toMatch(/panier a changé/i);
		});

		it("refuse quand le panier serveur est vide", async () => {
			mockGetCart.mockResolvedValue({ items: [] });

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(false);
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("la garde s'applique APRÈS le pre-check d'idempotence (panier vidé par le webhook)", async () => {
			// Sur une commande déjà liée et PAYÉE, le webhook a vidé le panier : exiger la
			// parité ici rendrait tout retour sur la page de paiement impossible.
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder());
			mockGetCart.mockResolvedValue({ items: [] });

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(true);
			expect((result as { orderId: string }).orderId).toBe("order-existing");
		});
	});

	// ──────────────────────────────────────────────────────────────
	// KI-001 — correction d'adresse sur un hit idempotent
	// ──────────────────────────────────────────────────────────────

	describe("correction d'adresse sur hit idempotent (KI-001)", () => {
		beforeEach(() => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder());
		});

		it("répercute une correction de rue sur le snapshot de la commande PENDING", async () => {
			// Le défaut d'origine : mêmes lignes, même pays, même CP ⇒ la resoumission était
			// acceptée telle quelle et le colis partait à l'ANCIENNE rue, sans aucun signal.
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["shippingAddress1"],
			});

			const result = await confirmCheckout(
				createValidData({
					shippingAddress: { ...VALID_SHIPPING_ADDRESS, addressLine1: "14 Rue de la Paix" },
				}),
			);

			expect(result.success).toBe(true);
			expect(mockUpdatePendingShippingSnapshot).toHaveBeenCalledWith(
				expect.objectContaining({
					orderId: "order-existing",
					shipping: expect.objectContaining({ address1: "14 Rue de la Paix" }),
				}),
			);
		});

		it("splitte fullName en firstName/lastName pour le snapshot", async () => {
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["shippingFirstName"],
			});

			await confirmCheckout(
				createValidData({
					shippingAddress: { ...VALID_SHIPPING_ADDRESS, fullName: "Marion Duval" },
				}),
			);

			expect(mockUpdatePendingShippingSnapshot).toHaveBeenCalledWith(
				expect.objectContaining({
					shipping: expect.objectContaining({ firstName: "Marion", lastName: "Duval" }),
				}),
			);
		});

		it("répercute AUSSI le nom et l'email corrigés (audit invariant 5, 2026-08-07)", async () => {
			// Le service ne recevait que les 8 `shipping*` : `customerName` divergeait de
			// `shippingFirstName + shippingLastName` — recomposé du MÊME `fullName` — et
			// `customerEmail` restait fautif.
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["customerName", "customerEmail"],
			});

			await confirmCheckout(
				createValidData({
					email: "marion@example.com",
					shippingAddress: { ...VALID_SHIPPING_ADDRESS, fullName: "Marion Duval" },
				}),
			);

			expect(mockUpdatePendingShippingSnapshot).toHaveBeenCalledWith(
				expect.objectContaining({
					shipping: expect.objectContaining({
						customerName: "Marion Duval",
						customerEmail: "marion@example.com",
					}),
				}),
			);
		});

		it("pousse le nouveau receipt_email sur le PaymentIntent quand l'email a changé", async () => {
			// ⚠️ Corriger `Order.customerEmail` ne SUFFIT PAS : `checkout-post-tasks` envoie
			// la confirmation à `paymentIntent.receipt_email ?? order.customerEmail` — le PI
			// GAGNE — et son `receipt_email` n'est posé que sur le chemin de CRÉATION.
			// Sans ce push, l'email de confirmation (donc l'unique lien de suivi HMAC)
			// repartirait à l'adresse fautive malgré la correction en base.
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["customerEmail"],
			});

			await confirmCheckout(createValidData({ email: "marion@example.com" }));

			expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith("pi_test_123", {
				receipt_email: "marion@example.com",
			});
		});

		it("ne touche PAS au PaymentIntent quand seule l'adresse a changé", async () => {
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["shippingAddress1"],
			});

			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("réutilise l'email déjà en base quand la resoumission n'en porte aucun", async () => {
			// Surtout pas de refus « email requis » ici : la commande existe déjà avec un
			// email valide, bloquer le paiement serait une régression. Invité (pas de
			// session) ET pas d'email resoumis ⇒ c'est le repli DB qui doit jouer.
			mockGetSession.mockResolvedValue(null);
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: false,
				reason: "no-change",
			});

			const result = await confirmCheckout(createValidData({ email: undefined }));

			expect(result.success).toBe(true);
			expect(mockUpdatePendingShippingSnapshot).toHaveBeenCalledWith(
				expect.objectContaining({
					shipping: expect.objectContaining({ customerEmail: "cliente@example.com" }),
				}),
			);
		});

		it("un échec du push receipt_email ne bloque PAS le paiement (best-effort)", async () => {
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["customerEmail"],
			});
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("stripe down"));

			const result = await confirmCheckout(createValidData({ email: "marion@example.com" }));

			expect(result.success).toBe(true);
		});

		it("invalide le cache commande quand le snapshot a réellement changé", async () => {
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: true,
				changedFields: ["shippingCity"],
			});

			await confirmCheckout(createValidData());

			expect(mockGetOrderMetadataInvalidationTags).toHaveBeenCalledWith("order-existing");
			expect(mockUpdateTag).toHaveBeenCalledWith("order-meta-order-existing");
		});

		it("n'invalide rien quand l'adresse est inchangée (double-clic)", async () => {
			mockUpdatePendingShippingSnapshot.mockResolvedValue({
				updated: false,
				reason: "no-change",
			});

			await confirmCheckout(createValidData());

			expect(mockGetOrderMetadataInvalidationTags).not.toHaveBeenCalled();
		});

		it("un échec de correction ne bloque PAS le paiement (best-effort)", async () => {
			// La commande est par ailleurs cohérente : refuser le paiement pour un snapshot
			// non corrigé serait un cul-de-sac bien pire que le défaut d'origine.
			mockUpdatePendingShippingSnapshot.mockRejectedValue(new Error("advisory lock timeout"));

			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(true);
			expect(mockSentryCaptureException).toHaveBeenCalled();
		});

		it("n'est PAS tenté quand la resoumission est refusée pour divergence de montant", async () => {
			// Pays différent ⇒ tarif d'expédition différent ⇒ refus. Aucune raison de
			// toucher au snapshot d'une commande dont on refuse le paiement.
			const result = await confirmCheckout(
				createValidData({
					shippingAddress: { ...VALID_SHIPPING_ADDRESS, country: "BE", postalCode: "1000" },
				}),
			);

			expect(result.success).toBe(false);
			expect(mockUpdatePendingShippingSnapshot).not.toHaveBeenCalled();
		});
	});

	describe("idempotence", () => {
		it("should return existing order data when order already exists for PI", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder());

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: true,
				orderId: "order-existing",
				orderNumber: "SYN-20260301-XXXX",
				finalAmount: 4990,
			});
		});

		it("should not create a new order when idempotence check finds existing", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder());

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("should query by stripePaymentIntentId for idempotence check", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(null);

			await confirmCheckout(createValidData({ paymentIntentId: "pi_test_123" }));

			expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
				where: { stripePaymentIntentId: "pi_test_123" },
				// CHECKOUT-CONSENT-001 : le snapshot destination + lignes est nécessaire
				// pour refuser un hit idempotent divergent.
				select: {
					id: true,
					orderNumber: true,
					total: true,
					shippingCountry: true,
					shippingPostalCode: true,
					// KI-001 (2026-08-07) : repli de la correction d'identité quand la
					// resoumission n'apporte aucun email.
					customerEmail: true,
					items: { select: { skuId: true, quantity: true } },
				},
			});
		});

		// CHECKOUT-IDEM-002 : le pre-check idempotence n'est pas atomique avec le
		// create — deux confirmCheckout concurrents sur le même PI (double clic,
		// retry réseau) font que le perdant prend un P2002 sur stripePaymentIntentId.
		// Il doit être résolu en hit idempotent, pas en erreur générique.
		// @regression checkout-idem-p2002
		it("CHECKOUT-IDEM-002: resolves a concurrent P2002 on stripePaymentIntentId into an idempotent hit", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(
				new mockPrismaClientKnownRequestError("Unique constraint failed", "P2002"),
			);
			// 1er findUnique = idempotence (null, le gagnant n'a pas encore commité) ;
			// 2e = re-fetch post-P2002 (le gagnant a commité entre-temps).
			mockPrisma.order.findUnique
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(
					createBoundOrder({ id: "order-win", orderNumber: "SYN-WIN", total: 5090 }),
				);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: true,
				orderId: "order-win",
				orderNumber: "SYN-WIN",
				finalAmount: 5090,
			});
			// Pas d'update PI ni de cleanup : la requête gagnante s'en charge.
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
			expect(mockPrisma.order.delete).not.toHaveBeenCalled();
		});

		it("CHECKOUT-IDEM-002: falls back to generic error when P2002 comes from another constraint (no order for this PI)", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(
				new mockPrismaClientKnownRequestError("Unique constraint failed", "P2002"),
			);
			// Re-fetch ne trouve rien (ex: collision orderNumber) → rethrow → catch global.
			mockPrisma.order.findUnique.mockResolvedValue(null);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		it("CHECKOUT-IDEM-002: does not swallow non-P2002 Prisma errors", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(
				new mockPrismaClientKnownRequestError("Transaction timeout", "P2024"),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
			// Aucun re-fetch idempotent tenté pour un code autre que P2002 :
			// un seul findUnique (le pre-check idempotence).
			expect(mockPrisma.order.findUnique).toHaveBeenCalledTimes(1);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	// ──────────────────────────────────────────────────────────────
	// CHECKOUT-IDOR-001 — ownership du PaymentIntent
	// ──────────────────────────────────────────────────────────────

	describe("PI ownership (CHECKOUT-IDOR-001)", () => {
		function mockPiMetadata(metadata: Record<string, string>, status = "requires_confirmation") {
			mockStripe.paymentIntents.retrieve.mockResolvedValue({
				...MOCK_PAYMENT_INTENT,
				status,
				metadata,
			});
		}

		it("rejects a PI owned by another authenticated user — no order created", async () => {
			mockPiMetadata({ userId: "cm3userother00qz8v4h2j9d3" });

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: "Accès non autorisé au paiement." });
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("rejects a guest PI whose guestSessionId differs from the caller's session", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateGuestSessionId.mockResolvedValue("550e8400-e29b-41d4-a716-446655440000");
			mockPiMetadata({
				userId: "guest",
				guestSessionId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
			});

			const result = await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(result).toEqual({ success: false, error: "Accès non autorisé au paiement." });
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("rejects when an authenticated user submits a guest PI", async () => {
			mockPiMetadata({
				userId: "guest",
				guestSessionId: "550e8400-e29b-41d4-a716-446655440000",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: "Accès non autorisé au paiement." });
		});

		it("rejects a malformed ownership field (Zod drop → deny)", async () => {
			// `userId` non-cuid2 : droppé par parsePaymentIntentMetadata → undefined → deny
			mockPiMetadata({ userId: "user-123" });

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: "Accès non autorisé au paiement." });
		});

		it("rejects a PI already bound to another order (raw metadata.orderId guard)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(null);
			mockPiMetadata({
				userId: "cm3user0000123qz8v4h2j9d3",
				orderId: "order-of-someone-else",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Commande déjà initiée — actualise la page.",
			});
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("refuses a malformed orderId too (presence guard reads the raw key)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(null);
			mockPiMetadata({ userId: "cm3user0000123qz8v4h2j9d3", orderId: "  " });

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Commande déjà initiée — actualise la page.",
			});
		});

		it("rejects an already succeeded PI BEFORE creating the order (no cleanup needed)", async () => {
			mockPiMetadata({ userId: "cm3user0000123qz8v4h2j9d3" }, "succeeded");

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: "Ce paiement a déjà été effectué." });
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("rejects an already canceled PI BEFORE creating the order", async () => {
			mockPiMetadata({ userId: "cm3user0000123qz8v4h2j9d3" }, "canceled");

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce paiement a été annulé. Recommence.",
			});
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("returns the service-unavailable message on CircuitBreakerError", async () => {
			mockStripe.paymentIntents.retrieve.mockRejectedValue(
				new mockCircuitBreakerErrorClass("paymentIntents"),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Le service de paiement est temporairement indisponible.",
			});
			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("returns an actionable message when the PI no longer exists", async () => {
			const missing = new StripeModule.errors.StripeInvalidRequestError({
				type: "invalid_request_error",
				message: "No such payment_intent: pi_test_123",
				code: "resource_missing",
			});
			mockStripe.paymentIntents.retrieve.mockRejectedValue(missing);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Session de paiement introuvable. Actualise la page pour recommencer.",
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// CHECKOUT-CONSENT-001 — divergence sur hit idempotent
	// ──────────────────────────────────────────────────────────────

	describe("idempotent divergence (CHECKOUT-CONSENT-001)", () => {
		const DIVERGENCE_ERROR =
			"Ta commande a déjà été initiée avec d'autres informations. Actualise la page pour repartir d'un montant à jour.";

		it("accepts an identical resubmission (double-clic) as an idempotent hit", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder({ total: 4999 }));

			const result = await confirmCheckout(createValidData({ displayedTotal: 4999 }));

			expect(result).toEqual({
				success: true,
				orderId: "order-existing",
				orderNumber: "SYN-20260301-XXXX",
				finalAmount: 4999,
			});
		});

		it("refuses when the shipping destination changed after the order was bound", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder({ shippingCountry: "BE" }));

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: DIVERGENCE_ERROR });
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("refuses when the postal code changed (shipping zone / delivery address)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createBoundOrder({ shippingPostalCode: "20000" }),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: DIVERGENCE_ERROR });
		});

		it("refuses when the cart lines changed", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createBoundOrder({ items: [{ skuId: VALID_SKU_ID, quantity: 3 }] }),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({ success: false, error: DIVERGENCE_ERROR });
		});

		it("refuses to charge MORE than the amount displayed to the customer (promo applied after a decline)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder({ total: 3499 }));

			// Le client affiche 29,99 € (code promo saisi après le refus de carte)
			const result = await confirmCheckout(createValidData({ displayedTotal: 2999 }));

			expect(result).toEqual({ success: false, error: DIVERGENCE_ERROR });
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("proceeds (and logs) when the bound order charges LESS than displayed", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder({ total: 2999 }));

			const result = await confirmCheckout(createValidData({ displayedTotal: 3499 }));

			expect(result).toMatchObject({ success: true, finalAmount: 2999 });
			expect(mockLoggerWarn).toHaveBeenCalledWith(
				"Checkout idempotent hit charges less than displayed",
				expect.objectContaining({ orderTotal: 2999, displayedTotal: 3499 }),
			);
		});

		it("stays permissive when the client omits displayedTotal (legacy payload)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(createBoundOrder({ total: 9999 }));

			const result = await confirmCheckout(createValidData());

			expect(result).toMatchObject({ success: true, finalAmount: 9999 });
		});

		it("also guards the concurrent P2002 branch", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(
				new mockPrismaClientKnownRequestError("Unique constraint failed", "P2002"),
			);
			mockPrisma.order.findUnique
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(createBoundOrder({ total: 5090 }));

			const result = await confirmCheckout(createValidData({ displayedTotal: 4000 }));

			expect(result).toEqual({ success: false, error: DIVERGENCE_ERROR });
		});
	});

	describe("rate limiting", () => {
		it("should return error when rate limit is exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
				retryAfter: 60,
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
			});
		});

		it("should use fallback rate limit error when no error message provided", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				error: undefined,
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Trop de tentatives. Veuillez réessayer plus tard.",
			});
		});

		it("should not create order when rate limited", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, error: "Rate limited" });

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
			expect(mockStripe.paymentIntents.update).not.toHaveBeenCalled();
		});

		it("should use user-based rate limit identifier for authenticated users", async () => {
			await confirmCheckout(createValidData());

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"checkout-confirm:user:cm3user0000123qz8v4h2j9d3",
				"create-session",
				"192.168.1.1",
			);
		});

		it("should use email+IP based identifier for guests with email", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateGuestSessionId.mockResolvedValue("6f9619ff-8b86-4d11-b42d-00c04fc964ff");

			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"checkout-confirm:guest:guest@example.com:192.168.1.1",
				"create-session",
				"192.168.1.1",
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Input validation
	// ──────────────────────────────────────────────────────────────

	describe("input validation", () => {
		it("should return validation error for empty cartItems", async () => {
			const result = await confirmCheckout(createValidData({ cartItems: [] }));

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeTruthy();
			}
		});

		it("should return validation error for missing paymentIntentId", async () => {
			const result = await confirmCheckout(createValidData({ paymentIntentId: "" }));

			expect(result.success).toBe(false);
		});

		it("should return error for missing guest email when no session email", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateGuestSessionId.mockResolvedValue("6f9619ff-8b86-4d11-b42d-00c04fc964ff");

			const result = await confirmCheckout(createValidData({ email: undefined }));

			expect(result).toEqual({
				success: false,
				error: "L'email est requis pour une commande invité.",
			});
		});

		it("should return error for missing user email when session has no email", async () => {
			mockGetSession.mockResolvedValue({
				user: { id: "cm3user0000123qz8v4h2j9d3", email: null },
			});

			const result = await confirmCheckout(createValidData({ email: undefined }));

			expect(result).toEqual({
				success: false,
				error: "Ton adresse email est manquante. Reconnecte-toi.",
			});
		});
	});

	// ──────────────────────────────────────────────────────────────
	// SKU validation
	// ──────────────────────────────────────────────────────────────

	describe("SKU validation", () => {
		it("should return error when SKU lookup fails", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: false,
				error: "SKU not found",
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Certains articles ne sont plus disponibles.",
			});
		});

		it("should not create order when SKU is unavailable", async () => {
			mockGetSkuDetails.mockResolvedValue({ success: false, error: "Out of stock" });

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("should call getSkuDetails for each cart item", async () => {
			const multipleItems = [
				{ skuId: VALID_SKU_ID, quantity: 1, priceAtAdd: 4500 },
				{ skuId: VALID_SKU_ID_2, quantity: 2, priceAtAdd: 3000 },
			];
			mockGetSkuDetails.mockResolvedValueOnce(MOCK_SKU_RESULT).mockResolvedValueOnce({
				success: true,
				data: {
					sku: {
						...MOCK_SKU_RESULT.data.sku,
						id: VALID_SKU_ID_2,
						priceInclTax: 3000,
					},
				},
			});

			setServerCart(multipleItems);

			await confirmCheckout(createValidData({ cartItems: multipleItems }));

			expect(mockGetSkuDetails).toHaveBeenCalledTimes(2);
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: VALID_SKU_ID });
			expect(mockGetSkuDetails).toHaveBeenCalledWith({ skuId: VALID_SKU_ID_2 });
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Price verification
	// ──────────────────────────────────────────────────────────────

	describe("price verification", () => {
		it("should return error when price changed since cart add", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: {
					sku: {
						...MOCK_SKU_RESULT.data.sku,
						priceInclTax: 5500, // changed from 4500
					},
				},
			});

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Les prix de certains articles ont changé. Actualise ton panier.",
			});
		});

		it("should not create order when price mismatch detected", async () => {
			mockGetSkuDetails.mockResolvedValue({
				success: true,
				data: { sku: { ...MOCK_SKU_RESULT.data.sku, priceInclTax: 9999 } },
			});

			await confirmCheckout(createValidData());

			expect(mockCreateOrderInTransaction).not.toHaveBeenCalled();
		});

		it("should proceed when price matches exactly", async () => {
			// priceAtAdd is 4500, SKU price is 4500 — exact match
			const result = await confirmCheckout(createValidData());

			expect(result.success).toBe(true);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI status: already succeeded
	// ──────────────────────────────────────────────────────────────

	describe("PI already succeeded", () => {
		function setupSucceededError() {
			const error = new StripeModule.errors.StripeInvalidRequestError({
				message:
					"This PaymentIntent's amount could not be updated because it has a status of succeeded.",
				type: "invalid_request_error",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(error);
		}

		it("should return error when PI update fails with succeeded status", async () => {
			setupSucceededError();

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce paiement a déjà été effectué.",
			});
		});

		it("should cleanup order when PI is already succeeded", async () => {
			setupSucceededError();
			setupCleanupOrderState();

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should attempt PI update before detecting succeeded status", async () => {
			setupSucceededError();

			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI status: already canceled
	// ──────────────────────────────────────────────────────────────

	describe("PI already canceled", () => {
		function setupCanceledError() {
			const error = new StripeModule.errors.StripeInvalidRequestError({
				message:
					"This PaymentIntent's amount could not be updated because it has a status of canceled.",
				type: "invalid_request_error",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(error);
		}

		it("should return error when PI update fails with canceled status", async () => {
			setupCanceledError();

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce paiement a été annulé. Recommence.",
			});
		});

		it("should cleanup order when PI is already canceled", async () => {
			setupCanceledError();
			setupCleanupOrderState();

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should attempt PI update before detecting canceled status", async () => {
			setupCanceledError();

			await confirmCheckout(createValidData());

			expect(mockStripe.paymentIntents.update).toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// PI cleanup with discount
	// ──────────────────────────────────────────────────────────────

	// ──────────────────────────────────────────────────────────────
	// Stripe update failure + cleanup
	// ──────────────────────────────────────────────────────────────

	describe("Stripe PI update failure", () => {
		it("should cleanup orphan order when stripe.paymentIntents.update fails", async () => {
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));
			setupCleanupOrderState();

			await confirmCheckout(createValidData());

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
			});
		});

		it("should return CircuitBreakerError message when stripe update fails with circuit breaker", async () => {
			mockStripe.paymentIntents.update.mockRejectedValue(
				new mockCircuitBreakerErrorClass("paymentIntents"),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Le service de paiement est temporairement indisponible.",
			});
		});

		it("should cleanup and re-throw when stripe update fails with non-CircuitBreaker error", async () => {
			const stripeError = new Error("Stripe generic error");
			mockStripe.paymentIntents.update.mockRejectedValue(stripeError);

			// The outer catch will handle the re-thrown error
			const result = await confirmCheckout(createValidData());

			// The re-thrown error is caught by the outer catch block
			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		// ORD-STRIPE-004 régression : entre la création de l'order (step 8) et l'échec
		// de `stripe.paymentIntents.update` (step 9), le webhook payment_intent.succeeded
		// peut avoir déjà marqué la commande PAID. cleanupFailedCheckout DOIT alors
		// abandonner (PAS de hard-delete d'une commande payée → carte débitée sans trace
		// DB) et alerter Sentry pour réconciliation manuelle.
		// @regression confirm-checkout-cleanup-aborts-on-paid
		it("ORD-STRIPE-004: aborts cleanup (no delete) + alerts Sentry when order already PAID by concurrent webhook", async () => {
			// 1er findUnique = idempotence (null) ; 2nd findUnique = dans cleanup (PAID).
			mockPrisma.order.findUnique
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ paymentStatus: "PAID", stripePaymentIntentId: "pi_123" });
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));

			await confirmCheckout(createValidData());

			// La commande payée n'est PAS supprimée et aucune transaction de rollback ne tourne.
			expect(mockPrisma.order.delete).not.toHaveBeenCalled();
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			// Alerte Sentry pour intervention admin (refund Stripe / réconciliation).
			expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
				"cleanupFailedCheckout aborted: order already PAID by concurrent webhook",
				"error",
			);
		});

		// ORD-STRIPE-004 : si la commande n'est PAS payée, cleanup hard-delete normalement
		// (contraste avec le cas PAID ci-dessus — garantit que la garde ne sur-bloque pas).
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling — unexpected exceptions
	// ──────────────────────────────────────────────────────────────

	describe("error handling", () => {
		it("should return generic error when an unexpected exception occurs", async () => {
			mockGetSession.mockRejectedValue(new Error("Unexpected DB failure"));

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		it("should log unexpected errors via logger.error (Sentry routed internally)", async () => {
			const error = new Error("Unexpected crash");
			mockGetSession.mockRejectedValue(error);

			await confirmCheckout(createValidData());

			expect(mockLoggerError).toHaveBeenCalledWith(
				"Failed to confirm checkout",
				error,
				expect.objectContaining({ service: "checkout" }),
			);
		});

		it("should return error when createOrderInTransaction throws", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(new Error("Transaction failed"));

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			});
		});

		/**
		 * @regression biz-bug-007
		 * Les rejets métier (code promo expiré entre validation panier et paiement,
		 * stock insuffisant, produit indisponible, zone non livrée) sont des
		 * BusinessError au message actionnable : ils doivent être surfacés au client
		 * tels quels, et NON masqués par le message d'erreur générique.
		 */
		it("[regression biz-bug-007] surfaces BusinessError message from createOrderInTransaction", async () => {
			mockCreateOrderInTransaction.mockRejectedValue(
				new BusinessError("Ce code promo a atteint sa limite d'utilisation"),
			);

			const result = await confirmCheckout(createValidData());

			expect(result).toEqual({
				success: false,
				error: "Ce code promo a atteint sa limite d'utilisation",
			});
		});
	});
});
