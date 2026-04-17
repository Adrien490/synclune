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
	mockValidateInput,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
	mockGenerateSlug,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findUnique: vi.fn(), create: vi.fn() },
		productCollection: { createMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
	mockGenerateSlug: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { DUPLICATE: "col-duplicate" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { NAVBAR_MENU: "navbar-menu" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message, data }),
	notFound: (entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	}),
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("../../schemas/collection.schemas", () => ({ duplicateCollectionSchema: {} }));

import { duplicateCollection } from "../duplicate-collection";

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(collectionId: string = VALID_CUID) {
	return createMockFormData({ collectionId });
}

function makeSourceCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Collection Source",
		slug: "collection-source",
		description: "Description source",
		status: "PUBLIC",
		products: [{ productId: "prod-1" }, { productId: "prod-2" }],
		...overrides,
	};
}

describe("duplicateCollection", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "a@b.c" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockImplementation((_s: unknown, d: unknown) => ({
			data: d as { collectionId: string },
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);
		mockGenerateSlug.mockResolvedValue("copie-de-collection-source");

		mockPrisma.collection.findUnique.mockResolvedValue(makeSourceCollection());
		mockPrisma.collection.create.mockResolvedValue({
			id: VALID_CUID_2,
			name: "Copie de Collection Source",
			slug: "copie-de-collection-source",
		});
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await duplicateCollection(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.collection.findUnique).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await duplicateCollection(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
	});

	it("should return validation error", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "invalid" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await duplicateCollection(undefined, makeFormData());

		expect(result).toEqual(validationError);
	});

	it("should return notFound when source collection does not exist", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(null);

		const result = await duplicateCollection(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.collection.create).not.toHaveBeenCalled();
	});

	it("should create duplicate with 'Copie de' prefix and DRAFT status", async () => {
		await duplicateCollection(undefined, makeFormData());

		expect(mockPrisma.collection.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					name: "Copie de Collection Source",
					slug: "copie-de-collection-source",
					description: "Description source",
					status: "DRAFT",
				}),
			}),
		);
	});

	it("should copy ProductCollection associations with isFeatured=false", async () => {
		await duplicateCollection(undefined, makeFormData());

		expect(mockPrisma.productCollection.createMany).toHaveBeenCalledWith({
			data: [
				{ productId: "prod-1", collectionId: VALID_CUID_2, isFeatured: false },
				{ productId: "prod-2", collectionId: VALID_CUID_2, isFeatured: false },
			],
		});
	});

	it("should skip createMany when source has no products", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(makeSourceCollection({ products: [] }));

		await duplicateCollection(undefined, makeFormData());

		expect(mockPrisma.productCollection.createMany).not.toHaveBeenCalled();
	});

	it("should invalidate cache and navbar menu", async () => {
		await duplicateCollection(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("copie-de-collection-source");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	it("should return success with new collection data", async () => {
		const result = await duplicateCollection(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Copie de Collection Source");
		expect((result as { data: { name: string } }).data.name).toBe("Copie de Collection Source");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.collection.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await duplicateCollection(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
