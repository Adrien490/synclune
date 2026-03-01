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
	mockValidateInput,
	mockGetSkuInvalidationTags,
	MockBusinessError,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}
	return {
		mockPrisma: {
			productSku: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
			$transaction: vi.fn(),
		},
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockValidateInput: vi.fn(),
		mockGetSkuInvalidationTags: vi.fn(),
		MockBusinessError,
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_SKU_TOGGLE_STATUS_LIMIT: "sku-toggle-status",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: MockBusinessError,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../schemas/sku.schemas", () => ({ deleteProductSkuSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { setDefaultSku } from "../set-default-sku";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ skuId: VALID_CUID });

function createMockSkuForDefault(overrides: Record<string, unknown> = {}) {
	return {
		sku: "BRC-LUNE-OR-M",
		productId: "prod-1",
		isActive: true,
		product: { title: "Bracelet Lune", slug: "bracelet-lune" },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("setDefaultSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID } });

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDefault());
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
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
		const result = await setDefaultSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await setDefaultSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid skuId", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await setDefaultSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error (via handleActionError) when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				return fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findUnique: vi.fn().mockResolvedValue(null),
					},
				});
			},
		);
		await setDefaultSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("should return error (via handleActionError) when SKU is inactive", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				return fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findUnique: vi.fn().mockResolvedValue(createMockSkuForDefault({ isActive: false })),
					},
				});
			},
		);
		await setDefaultSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("should deactivate all product SKUs before setting new default", async () => {
		await setDefaultSku(undefined, validFormData);
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { productId: "prod-1" },
			data: { isDefault: false },
		});
	});

	it("should set the selected SKU as default", async () => {
		await setDefaultSku(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isDefault: true },
		});
	});

	it("should use a transaction for atomicity", async () => {
		await setDefaultSku(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should invalidate cache tags after success", async () => {
		await setDefaultSku(undefined, validFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success status", async () => {
		const result = await setDefaultSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await setDefaultSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
