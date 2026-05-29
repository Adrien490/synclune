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
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetInventoryInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findUnique: vi.fn() },
		stockMovement: { create: vi.fn() },
		$queryRaw: vi.fn(),
		// Le runner exécute le callback contre le client mock (tx === mockPrisma)
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetInventoryInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_ADJUST_STOCK_LIMIT: "sku-adjust" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/sku.schemas", () => ({ adjustSkuStockSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getInventoryInvalidationTags: mockGetInventoryInvalidationTags,
}));

import { adjustSkuStock } from "../adjust-sku-stock";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	skuId: VALID_CUID,
	adjustment: "5",
});

// ============================================================================
// TESTS
// ============================================================================

describe("adjustSkuStock", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: 5 } });
		mockGetInventoryInvalidationTags.mockReturnValue(["sku-stock"]);
		// $transaction exécute le callback contre le client mock (tx === mockPrisma),
		// si bien que tx.$queryRaw et tx.stockMovement.create résolvent via les mocks.
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => unknown) =>
			cb(mockPrisma),
		);
		mockPrisma.stockMovement.create.mockResolvedValue({});
		// Use mockImplementation for tagged template literal compatibility
		mockPrisma.$queryRaw.mockImplementation(() => Promise.resolve([{ inventory: 15 }]));
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			inventory: 15,
			productId: "prod-1",
			product: { slug: "bracelet-lune" },
		});

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
		const result = await adjustSkuStock(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await adjustSkuStock(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await adjustSkuStock(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should call $queryRaw for stock adjustment", async () => {
		const result = await adjustSkuStock(undefined, validFormData);
		expect(mockPrisma.$queryRaw).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return error when SKU not found after update", async () => {
		mockPrisma.$queryRaw.mockImplementation(() => Promise.resolve([]));
		const result = await adjustSkuStock(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should prevent negative stock on decrement", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: -20 } });
		// First $queryRaw: conditional update returns [] (insufficient stock)
		// Second $queryRaw: SELECT to get current stock
		mockPrisma.$queryRaw
			.mockImplementationOnce(() => Promise.resolve([]))
			.mockImplementationOnce(() => Promise.resolve([{ inventory: 5 }]));
		const fd = createMockFormData({ skuId: VALID_CUID, adjustment: "-20" });

		const result = await adjustSkuStock(undefined, fd);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return success data with inventory info", async () => {
		const result = await adjustSkuStock(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toBeDefined();
	});

	it("should record a StockMovement on increment", async () => {
		await adjustSkuStock(undefined, validFormData);
		expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(1);
		expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				skuId: VALID_CUID,
				productId: "prod-1",
				previousInventory: 10, // 15 (newInventory) - 5 (delta)
				newInventory: 15,
				delta: 5,
				source: "MANUAL_ADJUST",
				createdById: "admin-1",
				createdByName: "Admin",
			}),
		});
	});

	it("should record a StockMovement on decrement", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: -3 } });
		mockPrisma.$queryRaw.mockImplementation(() => Promise.resolve([{ inventory: 12 }]));
		const fd = createMockFormData({ skuId: VALID_CUID, adjustment: "-3" });

		const result = await adjustSkuStock(undefined, fd);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				delta: -3,
				previousInventory: 15, // 12 - (-3)
				newInventory: 12,
				source: "MANUAL_ADJUST",
				createdById: "admin-1",
			}),
		});
	});

	it("should not record a StockMovement when decrement is refused (insufficient stock)", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, adjustment: -20 } });
		mockPrisma.$queryRaw
			.mockImplementationOnce(() => Promise.resolve([]))
			.mockImplementationOnce(() => Promise.resolve([{ inventory: 5 }]));
		const fd = createMockFormData({ skuId: VALID_CUID, adjustment: "-20" });

		const result = await adjustSkuStock(undefined, fd);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$queryRaw.mockImplementation(() => Promise.reject(new Error("DB crash")));
		const result = await adjustSkuStock(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
