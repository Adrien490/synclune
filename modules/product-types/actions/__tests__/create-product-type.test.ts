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
	mockSanitizeText,
	mockGenerateSlug,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
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
	ADMIN_PRODUCT_TYPE_LIMITS: { CREATE: "pt-create" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("../../schemas/product-type.schemas", () => ({ createProductTypeSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { createProductType } from "../create-product-type";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ label: "Bague", description: "Type de bijou" });
const validFormDataNoDescription = createMockFormData({ label: "Bague" });

// ============================================================================
// TESTS
// ============================================================================

describe("createProductType", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { label: "Bague", description: "Type de bijou" } });
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"]);
		mockPrisma.productType.findFirst.mockResolvedValue(null);
		mockPrisma.productType.create.mockResolvedValue({ id: "pt-1", label: "Bague" });
		mockGenerateSlug.mockResolvedValue("bague");
		mockSanitizeText.mockImplementation((text: string) => text);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await createProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await createProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await createProductType(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when label already exists", async () => {
		mockPrisma.productType.findFirst.mockResolvedValue({ id: "pt-existing", label: "Bague" });
		const result = await createProductType(undefined, validFormData);
		expect(mockError).toHaveBeenCalledWith(
			"Ce label de type existe deja. Veuillez en choisir un autre.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should generate slug from validated label", async () => {
		await createProductType(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "productType", "Bague");
	});

	it("should create product type with sanitized data", async () => {
		mockSanitizeText
			.mockReturnValueOnce("Bague sanitized")
			.mockReturnValueOnce("Type de bijou sanitized");
		mockGenerateSlug.mockResolvedValue("bague");
		await createProductType(undefined, validFormData);
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				label: "Bague sanitized",
				description: "Type de bijou sanitized",
				slug: "bague",
			}),
		});
	});

	it("should set isActive=true and isSystem=false on creation", async () => {
		await createProductType(undefined, validFormData);
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				isActive: true,
				isSystem: false,
			}),
		});
	});

	it("should invalidate cache after creation", async () => {
		await createProductType(undefined, validFormData);
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
	});

	it("should handle description as undefined when not provided", async () => {
		mockValidateInput.mockReturnValue({ data: { label: "Bague", description: undefined } });
		await createProductType(undefined, validFormDataNoDescription);
		expect(mockPrisma.productType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				description: undefined,
			}),
		});
	});

	it("should return success message after creation", async () => {
		const result = await createProductType(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Type de produit créé avec succès");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.create.mockRejectedValue(new Error("DB crash"));
		const result = await createProductType(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
