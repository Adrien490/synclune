import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetSession,
	mockCheckDiscountEligibility,
	mockCalculateDiscount,
	mockGetDiscountUsageCounts,
	mockAssertStoreOpen,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		cart: { findFirst: vi.fn(), update: vi.fn() },
		discount: { findUnique: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckDiscountEligibility: vi.fn(),
	mockCalculateDiscount: vi.fn(),
	mockGetDiscountUsageCounts: vi.fn(),
	mockAssertStoreOpen: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { DISCOUNT: "discount" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, k: string) => fd.get(k)?.toString() ?? null,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/discounts/services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));
vi.mock("@/modules/discounts/services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscount,
}));
vi.mock("@/modules/discounts/data/get-discount-usage-counts", () => ({
	getDiscountUsageCounts: mockGetDiscountUsageCounts,
}));
vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	GET_DISCOUNT_VALIDATION_SELECT: {},
}));
vi.mock("../../schemas/cart.schemas", () => ({
	applyCartDiscountSchema: {},
}));
vi.mock("@/modules/store-settings/services/store-closure-guard", () => ({
	assertStoreOpen: mockAssertStoreOpen,
}));

import { applyCartDiscount } from "../apply-cart-discount";

function makeFormData(code = "SUMMER20") {
	const fd = new FormData();
	fd.set("code", code);
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockReturnValue({ data: { code: "SUMMER20" } });
	mockPrisma.cart.findFirst.mockResolvedValue({
		id: "cart-1",
		items: [{ quantity: 2, sku: { priceInclTax: 5000, compareAtPrice: null } }],
	});
	mockPrisma.discount.findUnique.mockResolvedValue({
		id: "d1",
		code: "SUMMER20",
		type: "PERCENTAGE",
		value: 20,
		maxUsagePerUser: null,
	});
	mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "u@example.com" } });
	mockAssertStoreOpen.mockResolvedValue(null);
	mockCheckDiscountEligibility.mockReturnValue({ eligible: true });
	mockCalculateDiscount.mockReturnValue(2000);
	mockPrisma.cart.update.mockResolvedValue({});
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockImplementation((msg: string, data: unknown) => ({
		status: "success",
		message: msg,
		data,
	}));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("applyCartDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns rate limit error", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "rate" },
		});
		const result = await applyCartDiscount(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "rate" });
	});

	it("returns error when store is closed (defense-in-depth guard)", async () => {
		mockAssertStoreOpen.mockResolvedValue({ closed: true, message: "Boutique fermée." });
		await applyCartDiscount(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Boutique fermée.");
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("returns validation error on invalid input", async () => {
		mockValidateInput.mockReturnValue({ error: { status: "validation_error", message: "bad" } });
		const result = await applyCartDiscount(undefined, makeFormData());
		expect(result).toEqual({ status: "validation_error", message: "bad" });
	});

	it("returns error when cart empty", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({ id: "cart-1", items: [] });
		await applyCartDiscount(undefined, makeFormData());
		expect(mockError).toHaveBeenCalled();
	});

	it("returns error when discount code not found", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);
		await applyCartDiscount(undefined, makeFormData());
		expect(mockError).toHaveBeenCalled();
	});

	it("returns error when not eligible (min amount not met)", async () => {
		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Commande minimum de 50€ requise",
		});
		await applyCartDiscount(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("50"));
	});

	it("persists discount on cart and invalidates cache on success", async () => {
		await applyCartDiscount(undefined, makeFormData());
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cart-1" },
				data: expect.objectContaining({
					appliedDiscountCode: "SUMMER20",
					discountAmountCache: 2000,
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("SUMMER20"),
			expect.objectContaining({ code: "SUMMER20", discountAmount: 2000 }),
		);
	});
});
