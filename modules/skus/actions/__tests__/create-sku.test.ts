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
		product: { findUnique: vi.fn() },
		color: { findUnique: vi.fn() },
		material: { findMany: vi.fn() },
		productSku: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			create: vi.fn(),
			updateMany: vi.fn(),
		},
		skuMedia: { create: vi.fn(), createMany: vi.fn() },
		$transaction: vi.fn(),
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
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_CREATE_LIMIT: "sku-create" }));
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
	createProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));
vi.mock("../../utils/parse-media-from-form", () => ({
	parseMediaFromForm: mockParseMedia,
	parseMediaFromFormStrict: mockParseMedia,
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

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockParseMedia.mockReturnValue([]);
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
				materialIds: [],
				size: "",
				media: [],
			},
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.product.findUnique.mockResolvedValue({ id: VALID_CUID, slug: "test" });
		mockPrisma.color.findUnique.mockResolvedValue(null);
		mockPrisma.material.findMany.mockResolvedValue([]);
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		// Used by assertUniqueVariantCombination (M2M migration) — empty = no collision
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		// Used by generateUniqueTechnicalName to check uniqueness of generated SKU code
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		mockPrisma.productSku.create.mockResolvedValue({
			id: "sku-new",
			sku: "BRC-001",
			productId: VALID_CUID,
			product: { slug: "test" },
		});
		mockPrisma.productSku.updateMany.mockResolvedValue({});
		mockPrisma.skuMedia.createMany.mockResolvedValue({ count: 0 });

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
