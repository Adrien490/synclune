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
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
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
	ADMIN_COLLECTION_LIMITS: { BULK_ARCHIVE: "admin-collection-bulk-archive" },
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
	success: (message: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message, data }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
	notFound: (entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	}),
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
	bulkArchiveCollectionsSchema: {},
}));

import { bulkArchiveCollections } from "../bulk-archive-collections";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[] = VALID_IDS, targetStatus = "ARCHIVED") {
	return createMockFormData({
		collectionIds: JSON.stringify(ids),
		targetStatus,
	});
}

function createMockCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Collection Test",
		slug: "collection-test",
		status: "DRAFT",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkArchiveCollections", () => {
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
			data: data as { collectionIds: string[]; targetStatus: string },
		}));

		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "collection-1" }),
			createMockCollection({ id: VALID_CUID_2, slug: "collection-2" }),
		];
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// JSON parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON collectionIds", async () => {
		const formData = createMockFormData({
			collectionIds: "not-valid-json",
			targetStatus: "ARCHIVED",
		});

		const result = await bulkArchiveCollections(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Not found
	// --------------------------------------------------------------------------

	it("should return not found when some collections do not exist", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockResolvedValue([createMockCollection({ id: VALID_CUID })]);

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.collection.updateMany).not.toHaveBeenCalled();
	});

	it("should return not found when no collections exist", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockResolvedValue([]);

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// --------------------------------------------------------------------------
	// Success - archive
	// --------------------------------------------------------------------------

	it("should archive collections and update status", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1" }),
			createMockCollection({ id: VALID_CUID_2, slug: "col-2" }),
		];
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockResolvedValue(collections);

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(mockPrisma.collection.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
			data: { status: "ARCHIVED" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("archiv");
	});

	it("should restore collections when targetStatus is PUBLIC", async () => {
		const collections = [createMockCollection({ id: VALID_CUID, slug: "col-1" })];
		mockValidateInput.mockReturnValue({
			data: { collectionIds: [VALID_CUID], targetStatus: "PUBLIC" },
		});
		mockPrisma.collection.findMany.mockResolvedValue(collections);

		const result = await bulkArchiveCollections(undefined, makeFormData([VALID_CUID], "PUBLIC"));

		expect(mockPrisma.collection.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "PUBLIC" } }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("restaur");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache for each collection and navbar menu", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, slug: "col-1" }),
			createMockCollection({ id: VALID_CUID_2, slug: "col-2" }),
		];
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockResolvedValue(collections);

		await bulkArchiveCollections(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-1");
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	// --------------------------------------------------------------------------
	// Success data shape
	// --------------------------------------------------------------------------

	it("should return collections in success data", async () => {
		const collections = [
			createMockCollection({ id: VALID_CUID, name: "Ma Collection", slug: "ma-collection" }),
		];
		mockValidateInput.mockReturnValue({
			data: { collectionIds: [VALID_CUID], targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockResolvedValue(collections);

		const result = await bulkArchiveCollections(undefined, makeFormData([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect((result as { data: { count: number } }).data.count).toBe(1);
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkArchiveCollections(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
