import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockGetCartInvalidationTags,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetSkuDetails,
	mockCalculateShipping,
	mockGenerateOrderNumber,
	mockGetShippingZoneFromPostalCode,
	mockGetShippingOptionsForAddress,
	mockCheckDiscountEligibility,
	mockGetDiscountUsageCounts,
	mockCalculateDiscountWithExclusion,
	mockGetValidImageUrl,
	mockStripe,
	mockGetInvoiceFooter,
	mockSendAdminCheckoutFailedAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		order: { create: vi.fn(), delete: vi.fn() },
		orderItem: { create: vi.fn() },
		discount: { updateMany: vi.fn() },
		discountUsage: { create: vi.fn(), deleteMany: vi.fn() },
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
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetSkuDetails: vi.fn(),
	mockCalculateShipping: vi.fn(),
	mockGenerateOrderNumber: vi.fn(),
	mockGetShippingZoneFromPostalCode: vi.fn(),
	mockGetShippingOptionsForAddress: vi.fn(),
	mockCheckDiscountEligibility: vi.fn(),
	mockGetDiscountUsageCounts: vi.fn(),
	mockCalculateDiscountWithExclusion: vi.fn(),
	mockGetValidImageUrl: vi.fn(),
	mockStripe: {
		customers: { create: vi.fn() },
		coupons: { create: vi.fn(), del: vi.fn() },
		checkout: { sessions: { create: vi.fn() } },
	},
	mockGetInvoiceFooter: vi.fn(),
	mockSendAdminCheckoutFailedAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({ getSession: mockGetSession }));
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
vi.mock("@/shared/lib/rate-limit-config", () => ({ PAYMENT_LIMITS: { CREATE_SESSION: {} } }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/payments/schemas/create-checkout-session-schema", () => ({
	createCheckoutSessionSchema: {},
}));
vi.mock("@/modules/payments/utils/parse-full-name", () => ({
	parseFullName: vi.fn().mockReturnValue({ firstName: "Marie", lastName: "Dupont" }),
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string" || !v) return null;
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));
vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	getSkuDetails: mockGetSkuDetails,
}));
vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));
vi.mock("@/modules/orders/services/order-generation.service", () => ({
	generateOrderNumber: mockGenerateOrderNumber,
}));
vi.mock("@/modules/orders/services/shipping-zone.service", () => ({
	getShippingZoneFromPostalCode: mockGetShippingZoneFromPostalCode,
	getShippingOptionsForAddress: mockGetShippingOptionsForAddress,
}));
vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		NOT_FOUND: "Code promo introuvable",
		NOT_ACTIVE: "Ce code promo n'est plus actif",
		EXPIRED: "Ce code promo a expiré",
		MAX_USAGE_REACHED: "Ce code promo a atteint sa limite d'utilisation",
	},
}));
vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE_COUNTS: (id: string) => `discount-usage-${id}` },
}));
vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));
vi.mock("@/modules/discounts/data/get-discount-usage-counts", () => ({
	getDiscountUsageCounts: mockGetDiscountUsageCounts,
}));
vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscountWithExclusion,
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
	CircuitBreakerError: class extends Error {},
}));
vi.mock("@/shared/lib/media-validation", () => ({ getValidImageUrl: mockGetValidImageUrl }));
vi.mock("@/shared/constants/currency", () => ({ DEFAULT_CURRENCY: "eur" }));
vi.mock("@/modules/payments/services/stripe-customer.service", () => ({
	getOrCreateStripeCustomer: vi.fn().mockResolvedValue({ customerId: "cus_test", isNew: false }),
}));
vi.mock("@/modules/payments/services/checkout-line-items.service", () => ({
	buildStripeLineItems: vi.fn().mockReturnValue([]),
}));
vi.mock("@/modules/payments/services/checkout-session-builder.service", () => ({
	createStripeCheckoutSession: vi
		.fn()
		.mockResolvedValue({ id: "cs_test", client_secret: "cs_secret" }),
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCheckoutFailedAlert: mockSendAdminCheckoutFailedAlert,
}));

import { createCheckoutSession } from "../create-checkout-session";

// ============================================================================
// TEST DATA
// ============================================================================

const VALID_CART_ITEMS = [{ skuId: "sku-001", quantity: 1, priceAtAdd: 4500 }];

const VALID_SHIPPING_ADDRESS = {
	fullName: "Marie Dupont",
	addressLine1: "12 Rue de la Paix",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
	phoneNumber: "+33612345678",
};

function createFormData(
	overrides: Partial<{
		cartItems: unknown;
		shippingAddress: unknown;
		email: string;
		discountCode: string;
	}> = {},
): FormData {
	const fd = new FormData();
	fd.set("cartItems", JSON.stringify(overrides.cartItems ?? VALID_CART_ITEMS));
	fd.set("shippingAddress", JSON.stringify(overrides.shippingAddress ?? VALID_SHIPPING_ADDRESS));
	if (overrides.email !== undefined) fd.set("email", overrides.email);
	if (overrides.discountCode !== undefined) fd.set("discountCode", overrides.discountCode);
	return fd;
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({
		user: { id: "user-123", email: "marie@example.com" },
	});
	mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("192.168.1.1");
	mockGetRateLimitIdentifier.mockReturnValue("user:user-123");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	mockValidateInput.mockReturnValue({
		data: {
			cartItems: VALID_CART_ITEMS,
			shippingAddress: VALID_SHIPPING_ADDRESS,
			email: undefined,
			discountCode: undefined,
		},
	});

	mockGetSkuDetails.mockResolvedValue({
		success: true,
		data: {
			sku: {
				id: "sku-001",
				priceInclTax: 4500,
				size: null,
				material: null,
				color: null,
				compareAtPrice: null,
				images: [{ url: "https://utfs.io/f/image.jpg", isPrimary: true }],
				product: { id: "prod-001", title: "Bague Lune", description: "Belle bague" },
			},
		},
	});

	mockCalculateShipping.mockReturnValue(600);
	mockGetShippingZoneFromPostalCode.mockReturnValue({ zone: "METRO", department: "75" });
	mockGetShippingOptionsForAddress.mockReturnValue([]);
	mockGenerateOrderNumber.mockReturnValue("SYN-20260220-A1B2");
	mockGetValidImageUrl.mockImplementation((url: string | null | undefined) => url ?? null);

	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
			const tx = {
				...mockPrisma,
				$queryRaw: vi
					.fn()
					.mockResolvedValue([
						{ isActive: true, inventory: 10, productTitle: "Bague Lune", productStatus: "PUBLIC" },
					]),
				$executeRaw: vi.fn().mockResolvedValue(1),
			};
			return fn(tx as unknown as typeof mockPrisma);
		},
	);

	mockPrisma.order.create.mockResolvedValue({
		id: "order-001",
		orderNumber: "SYN-20260220-A1B2",
		total: 5100,
	});
	mockPrisma.orderItem.create.mockResolvedValue({});

	mockStripe.checkout.sessions.create.mockResolvedValue({
		id: "cs_test_123",
		client_secret: "cs_test_secret_abc",
	});
	mockGetInvoiceFooter.mockReturnValue("Footer");
	mockGetCartInvalidationTags.mockReturnValue(["cart-user-user-123"]);
	mockSendAdminCheckoutFailedAlert.mockResolvedValue({ success: true });

	mockSuccess.mockImplementation((message: string, data?: unknown) => ({
		status: ActionStatus.SUCCESS,
		message,
		data,
	}));
	mockError.mockImplementation((message: string) => ({
		status: ActionStatus.ERROR,
		message,
	}));
	mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
		status: ActionStatus.ERROR,
		message: fallback,
	}));
}

// ============================================================================
// TESTS — Discount edge cases
// ============================================================================

describe("createCheckoutSession — discount edge cases", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	it("should reject expired discount code via eligibility check", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				cartItems: VALID_CART_ITEMS,
				shippingAddress: VALID_SHIPPING_ADDRESS,
				email: undefined,
				discountCode: "EXPIRED20",
			},
		});

		const DISCOUNT_ROW = {
			id: "disc-expired",
			code: "EXPIRED20",
			type: "PERCENTAGE",
			value: 20,
			isActive: true,
			startsAt: new Date("2025-01-01"),
			endsAt: new Date("2025-12-31"),
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			usageCount: 0,
		};

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi
						.fn()
						.mockResolvedValueOnce([
							{
								isActive: true,
								inventory: 10,
								productTitle: "Bague Lune",
								productStatus: "PUBLIC",
							},
						])
						.mockResolvedValueOnce([DISCOUNT_ROW]),
					$executeRaw: vi.fn(),
				};
				return fn(tx as unknown as typeof mockPrisma);
			},
		);

		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Ce code promo a expiré",
		});

		const result = await createCheckoutSession(
			undefined,
			createFormData({ discountCode: "EXPIRED20" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
		// Stripe session should NOT be created
		expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
	});

	it("should reject discount when eligibility check returns not eligible", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				cartItems: VALID_CART_ITEMS,
				shippingAddress: VALID_SHIPPING_ADDRESS,
				email: undefined,
				discountCode: "INACTIVE10",
			},
		});

		const DISCOUNT_ROW = {
			id: "disc-inactive",
			code: "INACTIVE10",
			type: "PERCENTAGE",
			value: 10,
			isActive: false,
			startsAt: new Date("2026-01-01"),
			endsAt: null,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			usageCount: 0,
		};

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi
						.fn()
						.mockResolvedValueOnce([
							{
								isActive: true,
								inventory: 10,
								productTitle: "Bague Lune",
								productStatus: "PUBLIC",
							},
						])
						.mockResolvedValueOnce([DISCOUNT_ROW]),
					$executeRaw: vi.fn(),
				};
				return fn(tx as unknown as typeof mockPrisma);
			},
		);

		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Ce code promo n'est plus actif",
		});

		const result = await createCheckoutSession(
			undefined,
			createFormData({ discountCode: "INACTIVE10" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
		// Stripe session should NOT be created
		expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
		expect(mockStripe.coupons.create).not.toHaveBeenCalled();
	});

	it("should return error when all cart items fail stock validation", async () => {
		mockGetSkuDetails.mockResolvedValue({
			success: false,
			error: "Cet article n'est plus en stock",
		});

		const result = await createCheckoutSession(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return error when SKU is inactive during stock verification", async () => {
		// The first SKU lookup succeeds but transaction stock check finds it inactive
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				const tx = {
					...mockPrisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							isActive: false,
							inventory: 0,
							productTitle: "Bague Lune",
							productStatus: "PUBLIC",
						},
					]),
					$executeRaw: vi.fn(),
				};
				return fn(tx as unknown as typeof mockPrisma);
			},
		);

		const result = await createCheckoutSession(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
