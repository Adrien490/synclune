import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockGetSkuInvalidationTags,
	mockDeleteUploadThingFiles,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
	mockDeleteUploadThingFiles: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_DELETE_LIMIT: "sku-delete" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: class extends Error {},
	handleActionError: mockHandleActionError,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFiles,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	deleteProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { deleteProductSku } from "../delete-sku";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ skuId: VALID_CUID });

function createMockSkuForDelete(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-LUNE-OR-M",
		isDefault: false,
		isActive: true,
		productId: "prod-1",
		images: [],
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			status: "PUBLIC",
			_count: { skus: 2 },
			// Include both the SKU being deleted and another active SKU (length >= 2 passes the guard)
			skus: [{ id: VALID_CUID }, { id: VALID_CUID_2 }],
		},
		_count: { orderItems: 0, cartItems: 0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("deleteProductSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockDeleteUploadThingFiles.mockResolvedValue(undefined);

		mockSafeParse.mockReturnValue({
			success: true,
			data: { skuId: VALID_CUID },
		});

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete());
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.productSku.delete.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid skuId", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		});
		const result = await deleteProductSku(undefined, createMockFormData({ skuId: "bad" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when SKU is the last one for the product", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({
				product: {
					title: "Bracelet",
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 1 },
					skus: [{ id: VALID_CUID }],
				},
			}),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("derniere variante");
	});

	it("should return error when SKU has order items", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 3, cartItems: 0 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("3 article");
	});

	it("should use singular article label for exactly 1 order item", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 1, cartItems: 0 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("1 article");
		expect(result.message).not.toContain("articles");
	});

	it("should return error when SKU has cart items", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 0, cartItems: 2 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("2 panier");
	});

	it("should return error when PUBLIC product would have no active SKU after delete", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({
				isActive: true,
				product: {
					title: "Bracelet",
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 2 },
					// Only 1 active SKU total (the one being deleted) → would leave 0 active
					skus: [{ id: VALID_CUID }],
				},
			}),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("PUBLIC");
	});

	it("should succeed and delete a non-default SKU", async () => {
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.productSku.delete).toHaveBeenCalledWith({ where: { id: VALID_CUID } });
	});

	it("should promote fallback active SKU when deleting default SKU", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete({ isDefault: true }));
		const fallback = { id: VALID_CUID_2, sku: "BRC-LUNE-AR-M" };
		mockPrisma.productSku.findFirst.mockResolvedValueOnce(fallback);

		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID_2 },
			data: { isDefault: true },
		});
		expect(result.message).toContain(fallback.sku);
	});

	it("should promote any SKU as fallback when no active SKU exists", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete({ isDefault: true }));
		// First findFirst (active) returns null, second findFirst (any) returns fallback
		const fallback = { id: VALID_CUID_2, sku: "BRC-LUNE-AR-M" };
		mockPrisma.productSku.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(fallback);

		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID_2 },
			data: { isDefault: true },
		});
	});

	it("should call deleteUploadThingFilesFromUrls after DB delete", async () => {
		const images = [{ url: "https://ut.io/file1.jpg" }, { url: "https://ut.io/file2.jpg" }];
		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete({ images }));
		await deleteProductSku(undefined, validFormData);
		expect(mockDeleteUploadThingFiles).toHaveBeenCalledWith([
			"https://ut.io/file1.jpg",
			"https://ut.io/file2.jpg",
		]);
	});

	it("should invalidate cache tags after successful delete", async () => {
		await deleteProductSku(undefined, validFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await deleteProductSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
