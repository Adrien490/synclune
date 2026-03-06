import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			updateMany: vi.fn(),
			findMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { BULK_OPERATIONS: "admin-discount-bulk" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
	logAuditTx: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	bulkToggleDiscountStatusSchema: {},
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		UPDATE_FAILED: "Erreur lors de la modification du code promo",
	},
}));

import { bulkToggleDiscountStatus } from "../bulk-toggle-discount-status";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

/**
 * Note: bulkToggleDiscountStatus uses formData.getAll("ids") for IDs
 * so FormData needs multiple "ids" values appended
 */
function makeFormData(ids: string[] = VALID_IDS, isActive = "true"): FormData {
	const formData = new FormData();
	for (const id of ids) {
		formData.append("ids", id);
	}
	formData.set("isActive", isActive);
	return formData;
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkToggleDiscountStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[]; isActive: boolean },
		}));

		mockPrisma.discount.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.discount.findMany.mockResolvedValue([{ code: "CODE1" }, { code: "CODE2" }]);
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// isActive parsing
	// --------------------------------------------------------------------------

	it("should parse isActive as true when formData value is 'true'", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => {
			expect((data as { isActive: boolean }).isActive).toBe(true);
			return { data: { ids: VALID_IDS, isActive: true } };
		});

		await bulkToggleDiscountStatus(undefined, makeFormData(VALID_IDS, "true"));
	});

	it("should parse isActive as false when formData value is not 'true'", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => {
			expect((data as { isActive: boolean }).isActive).toBe(false);
			return { data: { ids: VALID_IDS, isActive: false } };
		});

		await bulkToggleDiscountStatus(undefined, makeFormData(VALID_IDS, "false"));
	});

	// --------------------------------------------------------------------------
	// Activation
	// --------------------------------------------------------------------------

	it("should activate discounts and update with notDeleted filter", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData(VALID_IDS, "true"));

		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS }, deletedAt: null },
			data: { isActive: true, manuallyDeactivated: false },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("activé");
	});

	it("should deactivate discounts and return correct message", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: false } });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData(VALID_IDS, "false"));

		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: false, manuallyDeactivated: true } }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("désactivé");
	});

	// --------------------------------------------------------------------------
	// Message with count
	// --------------------------------------------------------------------------

	it("should include count in success message for activation", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData());

		expect(result.message).toContain("2");
		expect(result.message).toContain("activé");
	});

	it("should include count in success message for deactivation", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], isActive: false } });

		const result = await bulkToggleDiscountStatus(undefined, makeFormData([VALID_CUID], "false"));

		expect(result.message).toContain("1");
		expect(result.message).toContain("désactivé");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate discount list and detail caches", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockGetDiscountInvalidationTags.mockImplementation((code?: string) =>
			code ? [`discounts-list`, `discount-${code}`] : ["discounts-list", "admin-badges"],
		);
		mockPrisma.discount.findMany.mockResolvedValue([{ code: "CODE1" }, { code: "CODE2" }]);

		await bulkToggleDiscountStatus(undefined, makeFormData());

		// Called without argument for list tags
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith();
		// Called per fetched discount code
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("CODE1");
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("CODE2");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockPrisma.discount.updateMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkToggleDiscountStatus(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
