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
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { BULK_DELETE: "admin-collection-bulk-delete" },
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

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { NAVBAR_MENU: "navbar-menu" },
}));

vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

vi.mock("../../schemas/collection.schemas", () => ({
	bulkDeleteCollectionsSchema: {},
}));

import { bulkDeleteCollections } from "../bulk-delete-collections";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[] = VALID_IDS) {
	return createMockFormData({ ids: JSON.stringify(ids) });
}

function createMockCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Collection Test",
		slug: "collection-test",
		status: "PUBLIC",
		_count: { products: 0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}));

		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1", _count: { products: 0 } }),
			createMockCollection({ id: VALID_CUID_2, slug: "col-2", _count: { products: 3 } }),
		];
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 2 });
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkDeleteCollections(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkDeleteCollections(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "not-valid-json" });

		const result = await bulkDeleteCollections(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	it("should default to empty array when ids field is null", async () => {
		const formData = createMockFormData({ ids: null });
		mockValidateInput.mockReturnValue({ data: { ids: [] } });
		mockPrisma.collection.findMany.mockResolvedValue([]);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 0 });

		await bulkDeleteCollections(undefined, formData);

		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), { ids: [] });
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkDeleteCollections(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Deletion
	// --------------------------------------------------------------------------

	it("should delete collections that have no products", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1", _count: { products: 0 } }),
		];
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } });
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 1 });

		const result = await bulkDeleteCollections(undefined, makeFormData([VALID_CUID]));

		expect(mockPrisma.collection.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID] } },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).not.toContain("produit");
	});

	it("should include product preservation message when collections have products", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1", _count: { products: 5 } }),
		];
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } });
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 1 });

		const result = await bulkDeleteCollections(undefined, makeFormData([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("préservé");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache for each deleted collection and navbar menu", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1" }),
			createMockCollection({ id: VALID_CUID_2, slug: "col-2" }),
		];
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 2 });

		await bulkDeleteCollections(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-1");
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return singular success message for one collection", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID] } });
		mockPrisma.collection.findMany.mockResolvedValue([
			createMockCollection({ id: VALID_CUID, slug: "col-1", _count: { products: 0 } }),
		]);
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 1 });

		const result = await bulkDeleteCollections(undefined, makeFormData([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 collection");
	});

	it("should return plural success message for multiple collections", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.collection.deleteMany.mockResolvedValue({ count: 2 });

		const result = await bulkDeleteCollections(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2 collections");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } });
		mockPrisma.collection.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkDeleteCollections(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
