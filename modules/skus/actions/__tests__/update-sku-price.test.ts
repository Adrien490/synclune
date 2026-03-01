import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockValidateInput,
	mockGetSkuInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidateInput: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_SKU_UPDATE_PRICE_LIMIT: "sku-update-price",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: class extends Error {},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/sku.schemas", () => ({ updateSkuPriceSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { updateSkuPrice } from "../update-sku-price";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	skuId: VALID_CUID,
	priceInclTaxEuros: "30.00",
	compareAtPriceEuros: "",
});

function createMockSkuForPrice(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-LUNE-OR-M",
		priceInclTax: 4999,
		productId: "prod-1",
		product: { slug: "bracelet-lune" },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateSkuPrice", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, priceInclTaxEuros: 30.0, compareAtPriceEuros: null },
		});

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForPrice());
		mockPrisma.productSku.update.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await updateSkuPrice(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateSkuPrice(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateSkuPrice(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await updateSkuPrice(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Variante non trouvee");
	});

	it("should convert euros to cents correctly (30.00 → 3000)", async () => {
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, priceInclTaxEuros: 30.0, compareAtPriceEuros: null },
		});
		await updateSkuPrice(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ priceInclTax: 3000 }),
			}),
		);
	});

	it("should handle floating-point prices without rounding errors (49.99 → 4999)", async () => {
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, priceInclTaxEuros: 49.99, compareAtPriceEuros: null },
		});
		await updateSkuPrice(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ priceInclTax: 4999 }),
			}),
		);
	});

	it("should convert compareAtPriceEuros to cents when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, priceInclTaxEuros: 30.0, compareAtPriceEuros: 45.0 },
		});
		await updateSkuPrice(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ compareAtPrice: 4500 }),
			}),
		);
	});

	it("should set compareAtPrice to null when compareAtPriceEuros is absent", async () => {
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, priceInclTaxEuros: 30.0, compareAtPriceEuros: null },
		});
		await updateSkuPrice(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ compareAtPrice: null }),
			}),
		);
	});

	it("should invalidate cache tags after successful update", async () => {
		await updateSkuPrice(undefined, validFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success with previous and new price data", async () => {
		const result = await updateSkuPrice(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toBeDefined();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await updateSkuPrice(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
