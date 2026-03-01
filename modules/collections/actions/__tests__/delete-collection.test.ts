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
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findUnique: vi.fn(), delete: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: {
		DELETE: "col-delete",
		UPDATE: "col-update",
		BULK_DELETE: "col-bulk-delete",
	},
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
}));
vi.mock("../../schemas/collection.schemas", () => ({ deleteCollectionSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { NAVBAR_MENU: "navbar-menu" },
}));

import { deleteCollection } from "../delete-collection";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function makeCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		slug: "bague-soleil",
		name: "Bague Soleil",
		_count: { products: 0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("deleteCollection", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } });
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			`collection-bague-soleil`,
		]);
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection());
		mockPrisma.collection.delete.mockResolvedValue({});

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

	// ---------- Auth ----------

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" },
		});
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
	});

	// ---------- Rate limit ----------

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
	});

	it("should enforce rate limit with DELETE limit key", async () => {
		await deleteCollection(undefined, validFormData);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("col-delete");
	});

	// ---------- Validation ----------

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
	});

	// ---------- Not found ----------

	it("should return error when collection does not exist", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(null);
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe pas");
		expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
	});

	it("should query collection with product count", async () => {
		await deleteCollection(undefined, validFormData);
		expect(mockPrisma.collection.findUnique).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			include: {
				_count: {
					select: { products: true },
				},
			},
		});
	});

	// ---------- Success: no products ----------

	it("should succeed and return short message when collection has no products", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ _count: { products: 0 } }));
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Collection supprimée avec succès");
	});

	it("should hard-delete the collection record", async () => {
		await deleteCollection(undefined, validFormData);
		expect(mockPrisma.collection.delete).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
		});
	});

	// ---------- Success: with products ----------

	it("should include preserved product count in message when collection had 1 product", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ _count: { products: 1 } }));
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 produit");
		expect(result.message).toContain("préservé");
	});

	it("should use plural form when collection had multiple products", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ _count: { products: 3 } }));
		const result = await deleteCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("3 produits");
		expect(result.message).toContain("préservés");
	});

	// ---------- Cache invalidation ----------

	it("should call getCollectionInvalidationTags with the collection slug", async () => {
		await deleteCollection(undefined, validFormData);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bague-soleil");
	});

	it("should invalidate each collection cache tag", async () => {
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		await deleteCollection(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("collections-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("collection-bague-soleil");
	});

	it("should invalidate the NAVBAR_MENU cache tag", async () => {
		await deleteCollection(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	// ---------- Error handling ----------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.collection.delete.mockRejectedValue(new Error("DB crash"));
		const result = await deleteCollection(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should pass the correct fallback message to handleActionError", async () => {
		mockPrisma.collection.delete.mockRejectedValue(new Error("DB crash"));
		await deleteCollection(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression de la collection",
		);
	});
});
