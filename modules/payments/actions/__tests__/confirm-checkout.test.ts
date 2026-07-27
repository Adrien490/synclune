import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaClientKnownRequestError,
	mockPrisma,
	mockGetSession,
	mockGetOrCreateCartSessionId,
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
	mockBuildStripeLineItems,
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
			},
			user: {
				findUnique: vi.fn(),
				updateMany: vi.fn(),
			},
			discount: {
				updateMany: vi.fn(),
			},
			discountUsage: {
				findMany: vi.fn(),
				deleteMany: vi.fn(),
			},
			address: {
				count: vi.fn(),
				create: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockGetSession: vi.fn(),
		mockGetOrCreateCartSessionId: vi.fn(),
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
		mockBuildStripeLineItems: vi.fn(),
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

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
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

vi.mock("@/modules/payments/services/checkout-line-items.service", () => ({
	buildStripeLineItems: mockBuildStripeLineItems,
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
		discountCode: undefined,
		paymentIntentId: "pi_test_123",
		saveInfo: false,
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
		shippingCountry: string;
		shippingPostalCode: string;
		items: Array<{ skuId: string; quantity: number }>;
	}> = {},
) {
	return {
		id: "order-existing",
		orderNumber: "SYN-20260301-XXXX",
		total: 4990,
		shippingCountry: VALID_SHIPPING_ADDRESS.country,
		shippingPostalCode: VALID_SHIPPING_ADDRESS.postalCode,
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
			images: [{ url: "https://utfs.io/f/image.jpg", isPrimary: true }],
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
	discountAmount: 0,
	appliedDiscountCode: null,
};

const MOCK_PAYMENT_INTENT = {
	id: "pi_test_123",
	status: "requires_confirmation",
	amount: 4500,
};

// ============================================================================
// HELPERS
// ============================================================================

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

	// Line items
	mockBuildStripeLineItems.mockReturnValue({
		lineItems: [],
		subtotal: 4500,
	});

	// Order creation
	mockCreateOrderInTransaction.mockResolvedValue(MOCK_ORDER_RESULT);

	// Stripe PI retrieve (modifiable state).
	// CHECKOUT-IDOR-001 : la metadata d'ownership est dérivée de la session
	// courante au moment de l'appel, pour que les blocs guest/authentifié n'aient
	// pas à la redéclarer. Les tests d'ownership la surchargent explicitement.
	mockStripe.paymentIntents.retrieve.mockImplementation(async () => {
		const session = (await mockGetSession()) as { user?: { id?: string } } | null;
		const sessionUserId = session?.user?.id ?? null;
		const guestSessionId = sessionUserId ? null : await mockGetOrCreateCartSessionId();
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

	// Cleanup transaction (for failed checkout tests)
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
	);
	// Advisory lock order-paid (acquireOrderPaidLockTx) pris dans la tx de cleanup.
	mockPrisma.$queryRaw.mockResolvedValue([]);
	mockPrisma.order.delete.mockResolvedValue({});
	mockPrisma.discount.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.discountUsage.deleteMany.mockResolvedValue({ count: 1 });
	// [[DISC-USAGE-002]] `cleanupFailedCheckout` libère désormais via
	// `releaseOrderDiscountUsageTx`, qui lit d'abord les usages par `orderId`.
	// Défaut « aucun usage » — les tests avec remise le surchargent.
	mockPrisma.discountUsage.findMany.mockResolvedValue([]);
}

// Chorégraphie des order.findUnique pour les tests exerçant cleanupFailedCheckout :
// 1er appel = idempotence step 3b (null), 2e = pre-check fast-path ORD-STRIPE-004,
// 3e = re-check SOUS l'advisory lock dans la tx (CHECKOUT-RACE-004). Sans ce helper,
// le re-check in-tx lit le défaut null → cleanup traite la commande comme déjà
// supprimée et ne delete rien.
function setupCleanupOrderState(
	inTxState: { paymentStatus: string; stripePaymentIntentId: string } | null = {
		paymentStatus: "PENDING",
		stripePaymentIntentId: "pi_test_123",
	},
) {
	mockPrisma.order.findUnique
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

		it("should backfill User.stripeCustomerId (no-op guard) for authenticated users", async () => {
			await confirmCheckout(createValidData());

			await vi.waitFor(() => {
				expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
					where: { id: "cm3user0000123qz8v4h2j9d3", stripeCustomerId: null },
					data: { stripeCustomerId: "cus_init_001" },
				});
			});
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

		it("should invalidate cart cache tags after success", async () => {
			await confirmCheckout(createValidData());

			expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(
				"cm3user0000123qz8v4h2j9d3",
				undefined,
			);
			expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-cm3user0000123qz8v4h2j9d3");
		});

		it("should invalidate discount usage cache when discount was applied", async () => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "PROMO20",
			});

			await confirmCheckout(createValidData({ discountCode: "PROMO20" }));

			expect(mockUpdateTag).toHaveBeenCalledWith("discount-usage-disc-001");
		});

		it("should call buildStripeLineItems with cart items and SKU results", async () => {
			await confirmCheckout(createValidData());

			expect(mockBuildStripeLineItems).toHaveBeenCalledWith(VALID_CART_ITEMS, [MOCK_SKU_RESULT]);
		});

		it("should call createOrderInTransaction with all required params", async () => {
			await confirmCheckout(createValidData({ paymentIntentId: "pi_test_123" }));

			expect(mockCreateOrderInTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					cartItems: VALID_CART_ITEMS,
					subtotal: 4500,
					firstName: "Marie",
					lastName: "Dupont",
					userId: "cm3user0000123qz8v4h2j9d3",
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
			mockGetOrCreateCartSessionId.mockResolvedValue("550e8400-e29b-41d4-a716-446655440000");
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

		it("should call getOrCreateCartSessionId for guest rate limiting", async () => {
			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockGetOrCreateCartSessionId).toHaveBeenCalled();
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
				expect.objectContaining({
					finalEmail: "guest@example.com",
					userId: null,
				}),
			);
		});

		it("should include cart session tag when invalidating cache for guest", async () => {
			mockGetCartInvalidationTags.mockReturnValue([
				"cart-session-550e8400-e29b-41d4-a716-446655440000",
			]);

			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(
				undefined,
				"550e8400-e29b-41d4-a716-446655440000",
			);
			expect(mockUpdateTag).toHaveBeenCalledWith(
				"cart-session-550e8400-e29b-41d4-a716-446655440000",
			);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Idempotence
	// ──────────────────────────────────────────────────────────────

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
			mockGetOrCreateCartSessionId.mockResolvedValue("550e8400-e29b-41d4-a716-446655440000");
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
				"user:cm3user0000123qz8v4h2j9d3",
				"create-session",
				"192.168.1.1",
			);
		});

		it("should use email+IP based identifier for guests with email", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("6f9619ff-8b86-4d11-b42d-00c04fc964ff");

			await confirmCheckout(createValidData({ email: "guest@example.com" }));

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"guest:guest@example.com:192.168.1.1",
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
			mockGetOrCreateCartSessionId.mockResolvedValue("6f9619ff-8b86-4d11-b42d-00c04fc964ff");

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

	describe("cleanup with discount applied", () => {
		beforeEach(() => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "SAVE10",
			});
			// [[DISC-USAGE-002]] La libération se fait par `orderId` : le service
			// canonique lit les usages puis décrémente par `discountId`.
			mockPrisma.discountUsage.findMany.mockResolvedValue([
				{ id: "usage-1", discountId: "disc-001" },
			]);
		});

		it("should rollback discount usage when cleanup triggered by succeeded PI", async () => {
			const error = new StripeModule.errors.StripeInvalidRequestError({
				message: "This PaymentIntent has a status of succeeded.",
				type: "invalid_request_error",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(error);
			setupCleanupOrderState();

			await confirmCheckout(createValidData({ discountCode: "SAVE10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			// [[DISC-USAGE-002]] Décrément par `id` (via les usages de la commande),
			// plus par `code` : un renommage admin du code entre la création de la
			// commande et le rollback ratait la ligne et laissait `usageCount` gonflé.
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { id: "disc-001", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
		});

		it("should rollback discount usage when cleanup triggered by canceled PI", async () => {
			const error = new StripeModule.errors.StripeInvalidRequestError({
				message: "This PaymentIntent has a status of canceled.",
				type: "invalid_request_error",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(error);
			setupCleanupOrderState();

			await confirmCheckout(createValidData({ discountCode: "SAVE10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			// [[DISC-USAGE-002]] Décrément par `id` (via les usages de la commande),
			// plus par `code` : un renommage admin du code entre la création de la
			// commande et le rollback ratait la ligne et laissait `usageCount` gonflé.
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { id: "disc-001", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
		});
	});

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

		it("should not skip cleanup when discount was applied and stripe update fails", async () => {
			mockCreateOrderInTransaction.mockResolvedValue({
				...MOCK_ORDER_RESULT,
				appliedDiscountId: "disc-001",
				appliedDiscountCode: "PROMO10",
			});
			mockStripe.paymentIntents.update.mockRejectedValue(
				new mockCircuitBreakerErrorClass("paymentIntents"),
			);
			setupCleanupOrderState();
			// [[DISC-USAGE-002]] La libération passe par `releaseOrderDiscountUsageTx`,
			// qui lit les usages par `orderId` avant de décrémenter.
			mockPrisma.discountUsage.findMany.mockResolvedValue([
				{ id: "usage-1", discountId: "disc-001" },
			]);

			await confirmCheckout(createValidData({ discountCode: "PROMO10" }));

			expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
				where: { orderId: "order-001" },
			});
			// Décrément par `id`, plus par `code` : un renommage admin du code entre la
			// création de la commande et le rollback ratait la ligne.
			expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
				where: { id: "disc-001", usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
			expect(mockPrisma.order.delete).toHaveBeenCalledWith({
				where: { id: "order-001" },
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
		it("ORD-STRIPE-004: still hard-deletes the orphan order when not PAID", async () => {
			setupCleanupOrderState();
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));

			await confirmCheckout(createValidData());

			expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: "order-001" } });
			expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
		});

		// CHECKOUT-RACE-004 régression : le pre-check ORD-STRIPE-004 n'est PAS atomique
		// avec le delete — le webhook peut flipper PAID (et décrémenter le stock) entre
		// le pre-check (qui lit PENDING) et la transaction de cleanup. Le re-check SOUS
		// l'advisory lock order-paid (le même que processOrderAtomically) doit alors
		// aborter : pas de delete d'une commande payée, pas de rollback discount,
		// alerte Sentry pour réconciliation manuelle.
		// @regression cleanup-paid-race
		it("CHECKOUT-RACE-004: aborts cleanup when order flips PAID between pre-check and tx (re-check under advisory lock)", async () => {
			setupCleanupOrderState({ paymentStatus: "PAID", stripePaymentIntentId: "pi_test_123" });
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));

			await confirmCheckout(createValidData());

			// L'advisory lock order-paid est bien pris dans la tx de cleanup.
			expect(mockPrisma.$queryRaw).toHaveBeenCalled();
			// La commande payée n'est PAS supprimée, aucun rollback discount.
			expect(mockPrisma.order.delete).not.toHaveBeenCalled();
			expect(mockPrisma.discountUsage.deleteMany).not.toHaveBeenCalled();
			expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
				"cleanupFailedCheckout aborted: order already PAID by concurrent webhook",
				"error",
			);
		});

		// CHECKOUT-RACE-004 : commande disparue entre pre-check et tx (cleanup
		// concurrent) — no-op silencieux, pas de delete ni d'alerte.
		it("CHECKOUT-RACE-004: skips quietly when order already deleted before the cleanup tx", async () => {
			setupCleanupOrderState(null);
			mockStripe.paymentIntents.update.mockRejectedValue(new Error("Stripe API error"));

			await confirmCheckout(createValidData());

			expect(mockPrisma.order.delete).not.toHaveBeenCalled();
			expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Save address
	// ──────────────────────────────────────────────────────────────

	describe("save address", () => {
		it("should trigger address save when saveInfo is true and user is authenticated", async () => {
			mockPrisma.$transaction.mockImplementation(
				async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
					// For address save transaction
					const tx = {
						address: {
							count: vi.fn().mockResolvedValue(0),
							create: vi.fn().mockResolvedValue({}),
						},
					};
					return fn(tx as unknown as typeof mockPrisma);
				},
			);

			await confirmCheckout(createValidData({ saveInfo: true }));

			// saveAddressForUser is fire-and-forget, so we verify $transaction was eventually called
			// after the main flow completes
			await vi.waitFor(() => {
				expect(mockPrisma.$transaction).toHaveBeenCalled();
			});
		});

		it("should not save address when saveInfo is false", async () => {
			// Reset $transaction call count — only cleanup transaction should be absent
			mockPrisma.$transaction.mockClear();

			await confirmCheckout(createValidData({ saveInfo: false }));

			// With saveInfo false, no address transaction should be called
			// (the cleanup transaction only runs on failure)
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("should not save address for guest users even when saveInfo is true", async () => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateCartSessionId.mockResolvedValue("6f9619ff-8b86-4d11-b42d-00c04fc964ff");
			mockPrisma.$transaction.mockClear();

			await confirmCheckout(createValidData({ email: "guest@example.com", saveInfo: true }));

			// Guest users have no userId, so saveAddressForUser should not be called
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});
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
