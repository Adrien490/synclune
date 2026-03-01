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
	mockDetectMediaType,
	mockParsePrimaryImage,
	mockParseGalleryMedia,
	mockSafeParse,
	mockGetSkuInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn() },
		color: { findUnique: vi.fn() },
		material: { findUnique: vi.fn() },
		productSku: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
		skuMedia: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockParsePrimaryImage: vi.fn(),
	mockParseGalleryMedia: vi.fn(),
	mockSafeParse: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_CREATE_LIMIT: "sku-create" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: class extends Error {},
	validateInput: vi.fn().mockReturnValue({ data: {} }),
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/modules/media/utils/media-type-detection", () => ({
	detectMediaType: mockDetectMediaType,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	createProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));
vi.mock("../../utils/parse-media-from-form", () => ({
	parsePrimaryImageFromForm: mockParsePrimaryImage,
	parseGalleryMediaFromForm: mockParseGalleryMedia,
}));

import { createProductSku } from "../create-sku";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	productId: VALID_CUID,
	priceInclTaxEuros: "49.99",
	inventory: "10",
	isActive: "true",
	isDefault: "false",
});

// ============================================================================
// TESTS
// ============================================================================

describe("createProductSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockParsePrimaryImage.mockReturnValue(null);
		mockParseGalleryMedia.mockReturnValue([]);
		mockDetectMediaType.mockReturnValue("IMAGE");

		// Re-setup safeParse mock after resetAllMocks
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				productId: VALID_CUID,
				sku: "",
				priceInclTaxEuros: 49.99,
				inventory: 10,
				isActive: true,
				isDefault: false,
				colorId: "",
				materialId: "",
				size: "",
				primaryImage: null,
				galleryMedia: [],
			},
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.product.findUnique.mockResolvedValue({ id: VALID_CUID, slug: "test" });
		mockPrisma.color.findUnique.mockResolvedValue(null);
		mockPrisma.material.findUnique.mockResolvedValue(null);
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.create.mockResolvedValue({
			id: "sku-new",
			sku: "BRC-001",
			productId: VALID_CUID,
			product: { slug: "test" },
		});
		mockPrisma.productSku.updateMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should use transaction for creation", async () => {
		await createProductSku(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should validate product exists in transaction", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null);
		const result = await createProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate cache after successful creation", async () => {
		await createProductSku(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createProductSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
