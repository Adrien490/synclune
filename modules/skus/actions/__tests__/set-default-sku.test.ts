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
			// `findMany` + `update` servent `moveSkuToFront` (renumérotation des rangs —
			// remplace la promotion de flag isDefault, audit schéma V5, lot A2).
			productSku: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
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
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_SKU_TOGGLE_STATUS_LIMIT: "sku-toggle-status",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: MockBusinessError,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string, data?: unknown) => ({
		status: ActionStatus.SUCCESS,
		message,
		data,
	}),
}));
vi.mock("../../schemas/sku.schemas", () => ({ setDefaultProductSkuSchema: {} }));
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

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID } });

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDefault());
		// Sœurs lues par moveSkuToFront, dans l'ordre canonique (position asc, id asc).
		mockPrisma.productSku.findMany.mockResolvedValue([{ id: "sku-sibling-1" }]);
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

	// « Définir par défaut » = amener au rang 0 + renuméroter les sœurs en
	// préservant leur ordre relatif (moveSkuToFront) — plus de flag à basculer.
	it("should move the selected SKU to rank 0", async () => {
		await setDefaultSku(undefined, validFormData);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { position: 0 },
		});
	});

	it("should renumber sibling SKUs after the new rank 0", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([{ id: "sku-a" }, { id: "sku-b" }]);
		await setDefaultSku(undefined, validFormData);
		// Sœurs lues hors la cible, renumérotées 1..n dans leur ordre relatif.
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { productId: "prod-1", deletedAt: null, id: { not: VALID_CUID } },
			orderBy: [{ position: "asc" }, { id: "asc" }],
			select: { id: true },
		});
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-a" },
			data: { position: 1 },
		});
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
			where: { id: "sku-b" },
			data: { position: 2 },
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
