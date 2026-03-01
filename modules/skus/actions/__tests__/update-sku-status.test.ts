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
	ADMIN_SKU_TOGGLE_STATUS_LIMIT: "sku-toggle-status",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: class extends Error {},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/sku.schemas", () => ({ updateProductSkuStatusSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { updateProductSkuStatus } from "../update-sku-status";

// ============================================================================
// HELPERS
// ============================================================================

const deactivateFormData = createMockFormData({ skuId: VALID_CUID, isActive: "false" });
const activateFormData = createMockFormData({ skuId: VALID_CUID, isActive: "true" });

function createMockExistingSku(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-LUNE-OR-M",
		isActive: true,
		isDefault: false,
		productId: "prod-1",
		product: { slug: "bracelet-lune" },
		...overrides,
	};
}

function createMockUpdatedSku(isActive: boolean) {
	return { id: VALID_CUID, sku: "BRC-LUNE-OR-M", isActive };
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateProductSkuStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockExistingSku());
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(false));

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
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
	});

	it("should return error when trying to deactivate the default SKU", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({ isDefault: true, isActive: true }),
		);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Impossible de desactiver");
	});

	it("should succeed when deactivating a non-default SKU", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(false));
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: false } }),
		);
	});

	it("should succeed when activating an inactive SKU", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: true } });
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({ isActive: false, isDefault: false }),
		);
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(true));
		const result = await updateProductSkuStatus(undefined, activateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: true } }),
		);
	});

	it("should invalidate cache tags after successful update", async () => {
		await updateProductSkuStatus(undefined, deactivateFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
