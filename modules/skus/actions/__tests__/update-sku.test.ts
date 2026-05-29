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
	mockParseMedia,
	mockSafeParse,
	mockGetSkuInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		skuMedia: { deleteMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
		color: { findUnique: vi.fn() },
		material: { findMany: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockParseMedia: vi.fn(),
	mockSafeParse: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_UPDATE_LIMIT: "sku-update" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: <T>(formData: FormData, key: string): T | null => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
		try {
			return JSON.parse(v) as T;
		} catch {
			return null;
		}
	},
	BusinessError: class extends Error {},
	validateInput: vi.fn().mockReturnValue({ data: {} }),
	validationError: (message: string) => ({ status: ActionStatus.VALIDATION_ERROR, message }),
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
	parseMediaFromForm: mockParseMedia,
	parseMediaFromFormStrict: mockParseMedia,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: vi.fn().mockResolvedValue({ deleted: 0, failed: 0 }),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/modules/wishlist/services/notify-back-in-stock", () => ({
	notifyBackInStock: vi.fn().mockResolvedValue(undefined),
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

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockParseMedia.mockReturnValue([]);
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
				materialIds: [],
				size: "",
				media: [],
			},
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		// SELECT inventory ... FOR UPDATE (verrou ligne avant écriture delta).
		// Doit refléter le même stock que findUnique (5) pour le gate back-in-stock.
		mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 5 }]);
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			isActive: true,
			inventory: 5,
			productId: "prod-1",
			product: {
				id: "prod-1",
				title: "Bracelet",
				slug: "test",
				status: "DRAFT",
				_count: { skus: 2 },
			},
			colors: [],
			materials: [],
			images: [],
		});
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		// Used by assertUniqueVariantCombination (M2M migration) — empty = no collision
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.productSku.update.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			productId: "prod-1",
			product: { title: "Bracelet", slug: "test" },
			colors: [],
			materials: [],
			size: null,
		});
		mockPrisma.productSku.updateMany.mockResolvedValue({});
		mockPrisma.skuMedia.deleteMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});
		mockPrisma.skuMedia.createMany.mockResolvedValue({ count: 0 });
		mockPrisma.color.findUnique.mockResolvedValue(null);
		mockPrisma.material.findMany.mockResolvedValue([]);

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

	// ============================================================================
	// PUBLIC PRODUCT GUARD (P1.3)
	// ============================================================================

	it("should reject deactivating last active SKU of a PUBLIC product", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				skuId: VALID_CUID,
				priceInclTaxEuros: 59.99,
				inventory: 15,
				isActive: false,
				isDefault: false,
				colorId: "",
				materialIds: [],
				size: "",
				media: [],
			},
		});
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			isActive: true,
			productId: "prod-1",
			product: {
				id: "prod-1",
				title: "Bracelet",
				slug: "test",
				status: "PUBLIC",
				_count: { skus: 1 },
			},
			colors: [],
			materials: [],
			images: [],
		});
		const result = await updateProductSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should allow deactivation when PUBLIC product has other active SKUs", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				skuId: VALID_CUID,
				priceInclTaxEuros: 59.99,
				inventory: 15,
				isActive: false,
				isDefault: false,
				colorId: "",
				materialIds: [],
				size: "",
				media: [],
			},
		});
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			isActive: true,
			productId: "prod-1",
			product: {
				id: "prod-1",
				title: "Bracelet",
				slug: "test",
				status: "PUBLIC",
				_count: { skus: 3 },
			},
			colors: [],
			materials: [],
			images: [],
		});
		const result = await updateProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should ignore PUBLIC guard when product is DRAFT", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				skuId: VALID_CUID,
				priceInclTaxEuros: 59.99,
				inventory: 15,
				isActive: false,
				isDefault: false,
				colorId: "",
				materialIds: [],
				size: "",
				media: [],
			},
		});
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			isActive: true,
			productId: "prod-1",
			product: {
				id: "prod-1",
				title: "Bracelet",
				slug: "test",
				status: "DRAFT",
				_count: { skus: 1 },
			},
			colors: [],
			materials: [],
			images: [],
		});
		const result = await updateProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});
