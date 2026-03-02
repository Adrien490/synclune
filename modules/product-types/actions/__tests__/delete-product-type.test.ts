import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

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
	mockNotFound,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		$transaction: vi.fn(),
		productType: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { DELETE: "pt-delete" },
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
vi.mock("../../schemas/product-type.schemas", () => ({ deleteProductTypeSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { deleteProductType } from "../delete-product-type";

// ============================================================================
// HELPERS
// ============================================================================

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		isSystem: false,
		_count: { products: 0 },
		...overrides,
	};
}

const validFormData = createMockFormData({ productTypeId: "pt-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteProductType", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1" } });
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"]);

		// Default: transaction executes the callback with a mock tx
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				return fn(mockPrisma);
			},
		);
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType());
		mockPrisma.productType.delete.mockResolvedValue({ id: "pt-1" });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
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
		const result = await deleteProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await deleteProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await deleteProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when product type does not exist", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(null);
		const result = await deleteProductType(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Type de produit");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when product type is a system type", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ isSystem: true, label: "Collier" }),
		);
		const result = await deleteProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("systeme");
	});

	it("should return error when product type has active products", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ _count: { products: 3 } }),
		);
		const result = await deleteProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("3");
	});

	it("should delete the product type and return success", async () => {
		const result = await deleteProductType(undefined, validFormData);
		expect(mockPrisma.productType.delete).toHaveBeenCalledWith({ where: { id: "pt-1" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after deletion", async () => {
		await deleteProductType(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await deleteProductType(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
