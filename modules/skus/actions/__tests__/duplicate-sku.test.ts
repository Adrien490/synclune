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
	mockSuccess,
	mockError,
	mockValidateInput,
	mockGetSkuInvalidationTags,
	mockGenerateUniqueTechnicalName,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findUnique: vi.fn(), create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidateInput: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
	mockGenerateUniqueTechnicalName: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_DUPLICATE_LIMIT: "sku-duplicate" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: class extends Error {},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/services/unique-name-generator.service", () => ({
	generateUniqueTechnicalName: mockGenerateUniqueTechnicalName,
}));
vi.mock("../../schemas/sku.schemas", () => ({ deleteProductSkuSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { duplicateSku } from "../duplicate-sku";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ skuId: VALID_CUID });

function createMockOriginalSku(overrides: Record<string, unknown> = {}) {
	return {
		sku: "BRC-LUNE-OR-M",
		productId: "prod-1",
		colorId: "color-1",
		materialId: "material-1",
		size: "M",
		priceInclTax: 4999,
		compareAtPrice: null,
		images: [],
		product: { slug: "bracelet-lune" },
		...overrides,
	};
}

function createMockDuplicatedSku(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID_2,
		sku: "BRC-LUNE-OR-M-COPY",
		productId: "prod-1",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID } });
		mockGenerateUniqueTechnicalName.mockResolvedValue({
			success: true,
			name: "BRC-LUNE-OR-M-COPY",
		});

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockOriginalSku());
		mockPrisma.productSku.create.mockResolvedValue(createMockDuplicatedSku());

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid skuId", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when original SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when unique name generation fails", async () => {
		mockGenerateUniqueTechnicalName.mockResolvedValue({
			success: false,
			error: "Too many copies",
		});
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Too many copies");
	});

	it("should create duplicate with reset inventory and inactive state", async () => {
		await duplicateSku(undefined, validFormData);
		expect(mockPrisma.productSku.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					inventory: 0,
					isActive: false,
					isDefault: false,
				}),
			}),
		);
	});

	it("should copy original SKU attributes to duplicate", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockOriginalSku({
				colorId: "color-1",
				materialId: "material-1",
				size: "M",
				priceInclTax: 4999,
			}),
		);
		await duplicateSku(undefined, validFormData);
		expect(mockPrisma.productSku.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					colorId: "color-1",
					materialId: "material-1",
					size: "M",
					priceInclTax: 4999,
				}),
			}),
		);
	});

	it("should invalidate cache tags after successful duplication", async () => {
		await duplicateSku(undefined, validFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success with new SKU id and sku code", async () => {
		const result = await duplicateSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ id: VALID_CUID_2, sku: "BRC-LUNE-OR-M-COPY" });
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
