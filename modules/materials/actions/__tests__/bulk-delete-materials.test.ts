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
			deleteMany: vi.fn(),
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
	requireAdmin: mockRequireAdmin,
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
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

vi.mock("../../schemas/materials.schemas", () => ({
	bulkDeleteMaterialsSchema: {},
}));

import { bulkDeleteMaterials } from "../bulk-delete-materials";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[] = VALID_IDS) {
	return createMockFormData({ ids: JSON.stringify(ids) });
}

function createMockMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Argent 925",
		slug: "argent-925",
		isActive: true,
		_count: { skus: 0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteMaterials", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ session: { user: { id: "admin-1" } } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}));

		const materials = [
			createMockMaterial({ id: VALID_CUID, slug: "argent-925", _count: { skus: 0 } }),
			createMockMaterial({ id: VALID_CUID_2, slug: "or-14k", _count: { skus: 0 } }),
		];
		mockPrisma.material.findMany.mockResolvedValue(materials);
		mockPrisma.material.deleteMany.mockResolvedValue({ count: 2 });
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "{invalid-json" });

		const result = await bulkDeleteMaterials(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	it("should default to empty array when ids field is null", async () => {
		const formData = createMockFormData({ ids: null });
		mockValidateInput.mockReturnValue({ data: { ids: [] } });
		mockPrisma.material.findMany.mockResolvedValue([]);
		mockPrisma.material.deleteMany.mockResolvedValue({ count: 0 });

		await bulkDeleteMaterials(undefined, formData);

		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), { ids: [] });
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Used materials guard
	// --------------------------------------------------------------------------

	it("should return error when all materials are used by SKUs", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.material.findMany.mockResolvedValue([
			createMockMaterial({ id: VALID_CUID, name: "Argent 925", _count: { skus: 3 } }),
			createMockMaterial({ id: VALID_CUID_2, name: "Or 14k", _count: { skus: 1 } }),
		]);

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("utilise");
		expect(mockPrisma.material.deleteMany).not.toHaveBeenCalled();
	});

	it("should return error listing material names when some are used", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.material.findMany.mockResolvedValue([
			createMockMaterial({ id: VALID_CUID, name: "Argent 925", _count: { skus: 2 } }),
			createMockMaterial({ id: VALID_CUID_2, name: "Or 14k", _count: { skus: 0 } }),
		]);

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Argent 925");
	});

	// --------------------------------------------------------------------------
	// Deletion
	// --------------------------------------------------------------------------

	it("should delete materials with no SKU usages", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.material.findMany.mockResolvedValue([
			createMockMaterial({ id: VALID_CUID, slug: "argent-925", _count: { skus: 0 } }),
			createMockMaterial({ id: VALID_CUID_2, slug: "or-14k", _count: { skus: 0 } }),
		]);
		mockPrisma.material.deleteMany.mockResolvedValue({ count: 2 });

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(mockPrisma.material.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate list cache and per-slug cache for each deleted material", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.material.findMany.mockResolvedValue([
			createMockMaterial({ id: VALID_CUID, slug: "argent-925", _count: { skus: 0 } }),
			createMockMaterial({ id: VALID_CUID_2, slug: "or-14k", _count: { skus: 0 } }),
		]);
		mockPrisma.material.deleteMany.mockResolvedValue({ count: 2 });

		await bulkDeleteMaterials(undefined, makeFormData());

		// Called without slug for list invalidation
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith();
		// Called with each slug for detail invalidation
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925");
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("or-14k");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.material.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkDeleteMaterials(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
