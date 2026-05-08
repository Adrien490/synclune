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
	mockLogAudit,
	mockGenerateSlug,
	mockGenerateUniqueReadableName,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
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
	mockLogAudit: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockGenerateUniqueReadableName: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { DUPLICATE: "pt-duplicate" },
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
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/shared/services/unique-name-generator.service", () => ({
	generateUniqueReadableName: mockGenerateUniqueReadableName,
}));
vi.mock("../../schemas/product-type.schemas", () => ({ duplicateProductTypeSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { duplicateProductType } from "../duplicate-product-type";

// ============================================================================
// HELPERS
// ============================================================================

const adminUser = { id: "admin-1", name: "Alice", email: "alice@test.com" };

function makeOriginal(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		slug: "bague",
		description: "Description originale",
		isActive: true,
		isSystem: false,
		...overrides,
	};
}

const validFormData = createMockFormData({ productTypeId: "pt-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateProductType", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: adminUser });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1" } });
		mockPrisma.productType.findUnique.mockResolvedValue(makeOriginal());
		mockPrisma.productType.findFirst.mockResolvedValue(null);
		mockPrisma.productType.create.mockResolvedValue({
			id: "pt-copy",
			label: "Bague (copie)",
			slug: "bague-copie",
		});
		mockGenerateUniqueReadableName.mockResolvedValue({
			success: true,
			name: "Bague (copie)",
		});
		mockGenerateSlug.mockResolvedValue("bague-copie");
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
		const result = await duplicateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await duplicateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid productTypeId", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await duplicateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return notFound when original does not exist", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(null);
		const result = await duplicateProductType(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Type de produit");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should duplicate with new label (copie) and new slug", async () => {
		await duplicateProductType(undefined, validFormData);
		expect(mockGenerateUniqueReadableName).toHaveBeenCalledWith("Bague", expect.any(Function));
		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "productType", "Bague (copie)");
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				label: "Bague (copie)",
				slug: "bague-copie",
				description: "Description originale",
			}),
		});
	});

	it("should force isActive=false on duplicate (draft)", async () => {
		await duplicateProductType(undefined, validFormData);
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ isActive: false }),
		});
	});

	it("should force isSystem=false on duplicate (never a system type)", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(makeOriginal({ isSystem: true }));
		await duplicateProductType(undefined, validFormData);
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ isSystem: false }),
		});
	});

	it("should return error when name generator fails after max attempts", async () => {
		mockGenerateUniqueReadableName.mockResolvedValue({
			success: false,
			error: "Impossible de generer un nom unique apres 100 tentatives",
		});
		const result = await duplicateProductType(undefined, validFormData);
		expect(mockError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.productType.create).not.toHaveBeenCalled();
	});

	it("should emit audit log with action productType.duplicate", async () => {
		await duplicateProductType(undefined, validFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: adminUser.id,
				action: "productType.duplicate",
				targetType: "productType",
				targetId: "pt-copy",
				metadata: { originalId: "pt-1", label: "Bague (copie)" },
			}),
		);
	});

	it("should invalidate cache after duplication", async () => {
		await duplicateProductType(undefined, validFormData);
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
	});

	it("should return success with duplicate id, label, and slug in data", async () => {
		const result = await duplicateProductType(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("Bague (copie)"),
			expect.objectContaining({
				id: "pt-copy",
				label: "Bague (copie)",
				slug: "bague-copie",
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.create.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateProductType(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
