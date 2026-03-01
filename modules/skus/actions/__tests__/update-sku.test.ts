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
		productSku: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		skuMedia: { deleteMany: vi.fn(), create: vi.fn() },
		color: { findUnique: vi.fn() },
		material: { findUnique: vi.fn() },
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
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_UPDATE_LIMIT: "sku-update" }));
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
	updateProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));
vi.mock("../../utils/parse-media-from-form", () => ({
	parsePrimaryImageFromForm: mockParsePrimaryImage,
	parseGalleryMediaFromForm: mockParseGalleryMedia,
}));

import { updateProductSku } from "../update-sku";

// ============================================================================
// TESTS
// ============================================================================

describe("updateProductSku", () => {
	const validFormData = createMockFormData({
		skuId: VALID_CUID,
		priceInclTaxEuros: "59.99",
		inventory: "15",
	});

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
				skuId: VALID_CUID,
				priceInclTaxEuros: 59.99,
				inventory: 15,
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
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			productId: "prod-1",
			product: { id: "prod-1", title: "Bracelet", slug: "test" },
		});
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.update.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			productId: "prod-1",
			product: { title: "Bracelet", slug: "test" },
			color: null,
			material: null,
			size: null,
		});
		mockPrisma.productSku.updateMany.mockResolvedValue({});
		mockPrisma.skuMedia.deleteMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});
		mockPrisma.color.findUnique.mockResolvedValue(null);
		mockPrisma.material.findUnique.mockResolvedValue(null);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
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
		const result = await updateProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should use transaction for update", async () => {
		await updateProductSku(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should return error when SKU not found", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await updateProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate cache after successful update", async () => {
		await updateProductSku(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateProductSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
