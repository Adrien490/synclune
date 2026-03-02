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
	mockValidateInput,
	mockHandleActionError,
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { BULK_OPERATIONS: "admin-material-bulk" },
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
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
	logAuditTx: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

vi.mock("../../schemas/materials.schemas", () => ({
	bulkToggleMaterialStatusSchema: {},
}));

import { bulkToggleMaterialStatus } from "../bulk-toggle-material-status";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[] = VALID_IDS, isActive = "true") {
	return createMockFormData({ ids: JSON.stringify(ids), isActive });
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkToggleMaterialStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[]; isActive: boolean },
		}));

		mockPrisma.material.findMany.mockResolvedValue([{ slug: "argent-925" }, { slug: "or-14k" }]);
		mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "{bad-json}", isActive: "true" });

		const result = await bulkToggleMaterialStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	it("should default to empty array when ids field is null", async () => {
		const formData = createMockFormData({ ids: null, isActive: "true" });
		mockValidateInput.mockReturnValue({ data: { ids: [], isActive: true } });
		mockPrisma.material.findMany.mockResolvedValue([]);
		mockPrisma.material.updateMany.mockResolvedValue({ count: 0 });

		await bulkToggleMaterialStatus(undefined, formData);

		expect(mockValidateInput).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ ids: [] }),
		);
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Activation
	// --------------------------------------------------------------------------

	it("should activate materials and return success message", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData(VALID_IDS, "true"));

		expect(mockPrisma.material.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
			data: { isActive: true },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("activé");
	});

	it("should deactivate materials and return success message", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: false } });
		mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData(VALID_IDS, "false"));

		expect(mockPrisma.material.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
			data: { isActive: false },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("désactivé");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate list cache and per-slug cache for each material", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockPrisma.material.findMany.mockResolvedValue([{ slug: "argent-925" }, { slug: "or-14k" }]);
		mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });

		await bulkToggleMaterialStatus(undefined, makeFormData());

		// Called without slug for list
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith();
		// Called for each slug
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925");
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("or-14k");
	});

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return singular message for one material", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID], isActive: true } });
		mockPrisma.material.findMany.mockResolvedValue([{ slug: "argent-925" }]);
		mockPrisma.material.updateMany.mockResolvedValue({ count: 1 });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 matériau");
		expect(result.message).not.toContain("matériaux");
	});

	it("should return plural message for multiple materials", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockPrisma.material.updateMany.mockResolvedValue({ count: 2 });

		const result = await bulkToggleMaterialStatus(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2 matériaux");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, isActive: true } });
		mockPrisma.material.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkToggleMaterialStatus(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
