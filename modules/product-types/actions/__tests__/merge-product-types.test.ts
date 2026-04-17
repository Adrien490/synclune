import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockTx,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
	mockLogAudit,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => {
	const tx = {
		productType: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
		product: {
			updateMany: vi.fn(),
		},
		customizationRequest: {
			updateMany: vi.fn(),
		},
	};
	type TxMock = typeof tx;
	return {
		mockPrisma: {
			$transaction: vi.fn(async (cb: (tx: TxMock) => unknown) => cb(tx)),
		},
		mockTx: tx,
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockNotFound: vi.fn(),
		mockLogAudit: vi.fn(),
		mockGetProductTypeInvalidationTags: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { MERGE: "pt-merge" },
}));
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
	notFound: mockNotFound,
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list" },
}));
vi.mock("../../schemas/product-type.schemas", () => ({ mergeProductTypesSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { mergeProductTypes } from "../merge-product-types";

// ============================================================================
// HELPERS
// ============================================================================

const adminUser = { id: "admin-1", name: "Alice", email: "alice@test.com" };

function pt(
	id: string,
	label: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return { id, label, slug: label.toLowerCase(), isSystem: false, ...overrides };
}

const validFormData = createMockFormData({ sourceId: "src-1", targetId: "tgt-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("mergeProductTypes", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: adminUser });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { sourceId: "src-1", targetId: "tgt-1" },
		});

		mockTx.productType.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
			if (args.where.id === "src-1") return pt("src-1", "Bague fantaisie");
			if (args.where.id === "tgt-1") return pt("tgt-1", "Bague");
			return null;
		});
		mockTx.product.updateMany.mockResolvedValue({ count: 3 });
		mockTx.customizationRequest.updateMany.mockResolvedValue({ count: 1 });
		mockTx.productType.delete.mockResolvedValue({ id: "src-1" });

		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => unknown) =>
			cb(mockTx),
		);

		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"]);

		mockSuccess.mockImplementation((msg: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} non trouvé`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error when schema rejects (sourceId === targetId)", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "IDs identiques" },
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return notFound when source is missing", async () => {
		mockTx.productType.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
			if (args.where.id === "tgt-1") return pt("tgt-1", "Bague");
			return null;
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Type source");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockTx.product.updateMany).not.toHaveBeenCalled();
	});

	it("should return notFound when target is missing", async () => {
		mockTx.productType.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
			if (args.where.id === "src-1") return pt("src-1", "Bague fantaisie");
			return null;
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Type cible");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should refuse merge when source is a system type", async () => {
		mockTx.productType.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
			if (args.where.id === "src-1") return pt("src-1", "Bague fantaisie", { isSystem: true });
			if (args.where.id === "tgt-1") return pt("tgt-1", "Bague");
			return null;
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("systeme");
		expect(mockTx.product.updateMany).not.toHaveBeenCalled();
		expect(mockTx.productType.delete).not.toHaveBeenCalled();
	});

	it("should accept merge when target is a system type (consolidation into canonical)", async () => {
		mockTx.productType.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
			if (args.where.id === "src-1") return pt("src-1", "Bague fantaisie");
			if (args.where.id === "tgt-1") return pt("tgt-1", "Bague", { isSystem: true });
			return null;
		});
		const result = await mergeProductTypes(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockTx.productType.delete).toHaveBeenCalledWith({ where: { id: "src-1" } });
	});

	it("should reassign products and customizationRequests from source to target", async () => {
		await mergeProductTypes(undefined, validFormData);
		expect(mockTx.product.updateMany).toHaveBeenCalledWith({
			where: { typeId: "src-1" },
			data: { typeId: "tgt-1" },
		});
		expect(mockTx.customizationRequest.updateMany).toHaveBeenCalledWith({
			where: { productTypeId: "src-1" },
			data: { productTypeId: "tgt-1" },
		});
	});

	it("should delete source type after reassignment", async () => {
		await mergeProductTypes(undefined, validFormData);
		expect(mockTx.productType.delete).toHaveBeenCalledWith({ where: { id: "src-1" } });
	});

	it("should emit audit log with counts", async () => {
		await mergeProductTypes(undefined, validFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "productType.merge",
				targetType: "productType",
				targetId: "tgt-1",
				metadata: expect.objectContaining({
					sourceId: "src-1",
					sourceLabel: "Bague fantaisie",
					targetId: "tgt-1",
					targetLabel: "Bague",
					reassignedProducts: 3,
					reassignedCustomizations: 1,
				}),
			}),
		);
	});

	it("should invalidate product-types tags AND products-list tag", async () => {
		await mergeProductTypes(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("products-list");
	});

	it("should return success with total count in message", async () => {
		const result = await mergeProductTypes(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("4 élément(s) fusionné(s) dans « Bague »"),
			expect.objectContaining({
				targetId: "tgt-1",
				reassignedProducts: 3,
				reassignedCustomizations: 1,
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return fallback message when 0 elements are reassigned", async () => {
		mockTx.product.updateMany.mockResolvedValue({ count: 0 });
		mockTx.customizationRequest.updateMany.mockResolvedValue({ count: 0 });
		const result = await mergeProductTypes(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("supprimé et fusionné"),
			expect.anything(),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await mergeProductTypes(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
