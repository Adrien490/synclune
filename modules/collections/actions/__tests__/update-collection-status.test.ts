import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
			findUnique: vi.fn(),
			update: vi.fn(),
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
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { UPDATE: "admin-collection-update" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message, data }),
	notFound: (entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	}),
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { NAVBAR_MENU: "navbar-menu" },
}));

vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

vi.mock("../../schemas/collection.schemas", () => ({
	updateCollectionStatusSchema: {},
}));

vi.mock("../../constants/collection.constants", () => ({
	COLLECTION_STATUS_LABELS: {
		DRAFT: "Brouillon",
		PUBLIC: "Publiée",
		ARCHIVED: "Archivée",
	},
}));

vi.mock("@/app/generated/prisma/client", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		CollectionStatus: {
			DRAFT: "DRAFT",
			PUBLIC: "PUBLIC",
			ARCHIVED: "ARCHIVED",
		},
	};
});

import { updateCollectionStatus } from "../update-collection-status";

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(id = VALID_CUID, status = "PUBLIC") {
	return createMockFormData({ id, status });
}

function createMockCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Collection Bijoux",
		slug: "collection-bijoux",
		status: "DRAFT",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateCollectionStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ session: { user: { id: "admin-1" } } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list", "collection-bijoux"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { id: string; status: string },
		}));

		mockPrisma.collection.findUnique.mockResolvedValue(createMockCollection());
		mockPrisma.collection.update.mockResolvedValue({});
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.collection.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.collection.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.collection.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Not found
	// --------------------------------------------------------------------------

	it("should return not found when collection does not exist", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "PUBLIC" } });
		mockPrisma.collection.findUnique.mockResolvedValue(null);

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.collection.update).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Same status (no-op)
	// --------------------------------------------------------------------------

	it("should return success without updating when status is already the same", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "PUBLIC" } });
		mockPrisma.collection.findUnique.mockResolvedValue(createMockCollection({ status: "PUBLIC" }));

		const result = await updateCollectionStatus(undefined, makeFormData(VALID_CUID, "PUBLIC"));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.collection.update).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Status update
	// --------------------------------------------------------------------------

	it("should update the collection status and return success", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "PUBLIC" } });
		mockPrisma.collection.findUnique.mockResolvedValue(createMockCollection({ status: "DRAFT" }));

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(mockPrisma.collection.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "PUBLIC" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return ARCHIVED message when status is ARCHIVED", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "ARCHIVED" } });
		mockPrisma.collection.findUnique.mockResolvedValue(createMockCollection({ status: "PUBLIC" }));

		const result = await updateCollectionStatus(undefined, makeFormData(VALID_CUID, "ARCHIVED"));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("archiv");
	});

	it("should return DRAFT message when status is DRAFT", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "DRAFT" } });
		mockPrisma.collection.findUnique.mockResolvedValue(createMockCollection({ status: "PUBLIC" }));

		const result = await updateCollectionStatus(undefined, makeFormData(VALID_CUID, "DRAFT"));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("brouillon");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate collection tags and navbar menu on status change", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "PUBLIC" } });
		mockPrisma.collection.findUnique.mockResolvedValue(
			createMockCollection({ slug: "collection-bijoux" }),
		);

		await updateCollectionStatus(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("collection-bijoux");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, status: "PUBLIC" } });
		mockPrisma.collection.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await updateCollectionStatus(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
