import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findMany: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { BULK_STATUS: "col-bulk-status" },
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
	validationError: (message: string) => ({ status: ActionStatus.VALIDATION_ERROR, message }),
}));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("../../schemas/collection.schemas", () => ({ bulkChangeCollectionStatusSchema: {} }));

import { bulkChangeCollectionStatus } from "../bulk-change-collection-status";

const VALID_IDS = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[] = VALID_IDS, targetStatus = "PUBLIC") {
	return createMockFormData({
		collectionIds: JSON.stringify(ids),
		targetStatus,
	});
}

function makeCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Ma Collection",
		slug: "ma-collection",
		status: "DRAFT",
		...overrides,
	};
}

describe("bulkChangeCollectionStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "a@b.c" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockImplementation((_s: unknown, d: unknown) => ({ data: d }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);

		const collections = [
			makeCollection({ id: VALID_CUID, slug: "col-1" }),
			makeCollection({ id: VALID_CUID_2, slug: "col-2" }),
		];
		mockPrisma.collection.findMany.mockResolvedValue(collections);
		mockPrisma.collection.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	it("should return auth error", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
	});

	it("should return error for malformed JSON", async () => {
		const formData = createMockFormData({
			collectionIds: "not-json",
			targetStatus: "PUBLIC",
		});

		const result = await bulkChangeCollectionStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return validation error", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "invalid" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(validationError);
	});

	it("should return notFound when some collections missing", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});
		mockPrisma.collection.findMany.mockResolvedValue([makeCollection({ id: VALID_CUID })]);

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.collection.updateMany).not.toHaveBeenCalled();
	});

	it("should reject when archived collections are included", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});
		mockPrisma.collection.findMany.mockResolvedValue([
			makeCollection({ id: VALID_CUID, slug: "col-1", status: "DRAFT" }),
			makeCollection({ id: VALID_CUID_2, slug: "col-2", status: "ARCHIVED" }),
		]);

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("archiv");
	});

	it("should update collections to PUBLIC", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});

		const result = await bulkChangeCollectionStatus(undefined, makeFormData(VALID_IDS, "PUBLIC"));

		expect(mockPrisma.collection.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
			data: { status: "PUBLIC" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("publi");
	});

	it("should update collections to DRAFT", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "DRAFT" },
		});
		mockPrisma.collection.findMany.mockResolvedValue([
			makeCollection({ id: VALID_CUID, slug: "col-1", status: "PUBLIC" }),
			makeCollection({ id: VALID_CUID_2, slug: "col-2", status: "PUBLIC" }),
		]);

		const result = await bulkChangeCollectionStatus(undefined, makeFormData(VALID_IDS, "DRAFT"));

		expect(mockPrisma.collection.updateMany).toHaveBeenCalledWith({
			where: { id: { in: VALID_IDS } },
			data: { status: "DRAFT" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("brouillon");
	});

	it("should invalidate cache per collection and navbar", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});

		await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-1");
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("col-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	it("should return collections data in success", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect((result as { data: { count: number } }).data.count).toBe(2);
	});

	it("should handle unexpected errors", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionIds: VALID_IDS, targetStatus: "PUBLIC" },
		});
		mockPrisma.collection.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkChangeCollectionStatus(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
