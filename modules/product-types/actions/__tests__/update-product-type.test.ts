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
	mockSanitizeText,
	mockGenerateSlug,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
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
	mockSanitizeText: vi.fn((text: string) => text),
	mockGenerateSlug: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { UPDATE: "pt-update" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("../../schemas/product-type.schemas", () => ({ updateProductTypeSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { updateProductType } from "../update-product-type";

// ============================================================================
// HELPERS
// ============================================================================

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		slug: "bague",
		isSystem: false,
		...overrides,
	};
}

const validFormData = createMockFormData({
	id: "pt-1",
	label: "Bague Updated",
	description: "Nouvelle description",
});

// ============================================================================
// TESTS
// ============================================================================

describe("updateProductType", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { id: "pt-1", label: "Bague Updated", description: "Nouvelle description" },
		});
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"]);
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType());
		mockPrisma.productType.findFirst.mockResolvedValue(null);
		mockPrisma.productType.update.mockResolvedValue({ id: "pt-1" });
		mockGenerateSlug.mockResolvedValue("bague-updated");
		mockSanitizeText.mockImplementation((text: string) => text);

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
		const result = await updateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await updateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await updateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when product type does not exist", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(null);
		const result = await updateProductType(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Type de produit");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when product type is a system type", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ isSystem: true, label: "Collier" }),
		);
		const result = await updateProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("systeme");
		expect(result.message).toContain("Collier");
	});

	it("should return error when new label already exists on another type", async () => {
		mockPrisma.productType.findFirst.mockResolvedValue({ id: "pt-other", label: "Bague Updated" });
		const result = await updateProductType(undefined, validFormData);
		expect(mockError).toHaveBeenCalledWith(
			"Ce label de type existe deja. Veuillez en choisir un autre.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should skip duplicate label check when label is unchanged", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: "pt-1", label: "Bague", description: "Description" },
		});
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType({ label: "Bague" }));
		await updateProductType(undefined, validFormData);
		expect(mockPrisma.productType.findFirst).not.toHaveBeenCalled();
	});

	it("should generate new slug when label changes", async () => {
		await updateProductType(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "productType", "Bague Updated");
	});

	it("should keep existing slug when label is unchanged", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: "pt-1", label: "Bague", description: "Description" },
		});
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ label: "Bague", slug: "bague" }),
		);
		await updateProductType(undefined, validFormData);
		expect(mockGenerateSlug).not.toHaveBeenCalled();
		expect(mockPrisma.productType.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ slug: "bague" }),
			}),
		);
	});

	it("should update type with sanitized label and description", async () => {
		mockSanitizeText
			.mockReturnValueOnce("Bague Updated sanitized")
			.mockReturnValueOnce("Nouvelle description sanitized");
		await updateProductType(undefined, validFormData);
		expect(mockPrisma.productType.update).toHaveBeenCalledWith({
			where: { id: "pt-1" },
			data: expect.objectContaining({
				label: "Bague Updated sanitized",
				description: "Nouvelle description sanitized",
			}),
		});
	});

	it("should set description to null when not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: "pt-1", label: "Bague Updated", description: undefined },
		});
		await updateProductType(undefined, validFormData);
		expect(mockPrisma.productType.update).toHaveBeenCalledWith({
			where: { id: "pt-1" },
			data: expect.objectContaining({
				description: null,
			}),
		});
	});

	it("should invalidate cache after update", async () => {
		await updateProductType(undefined, validFormData);
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
	});

	it("should return success message after update", async () => {
		const result = await updateProductType(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Type de produit modifié avec succès");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.update.mockRejectedValue(new Error("DB crash"));
		const result = await updateProductType(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
