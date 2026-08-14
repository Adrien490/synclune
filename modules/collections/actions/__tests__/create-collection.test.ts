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
	mockGenerateSlug,
	mockSanitizeText,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findFirst: vi.fn(), create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { CREATE: "col-create" },
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
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/collection.schemas", () => ({ createCollectionSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));

import { createCollection } from "../create-collection";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ name: "Nouvelle Collection", status: "PUBLIC" });

// ============================================================================
// TESTS
// ============================================================================

describe("createCollection", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { name: "Nouvelle Collection", description: null, status: "PUBLIC" },
		});
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGenerateSlug.mockResolvedValue("nouvelle-collection");
		// Miroir du contrat réel : les tags globaux vivent DANS le helper (les
		// updateTag manuels ont été retirés des actions).
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list", "admin-badges"]);

		// Transaction mock: execute the callback and return its result
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.collection.findFirst.mockResolvedValue(null);
		mockPrisma.collection.create.mockResolvedValue({ id: "col-1" });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when DB rejects duplicate name (P2002 on Collection.name)", async () => {
		const { Prisma } = await import("@/app/generated/prisma/client");
		const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
			code: "P2002",
			clientVersion: "test",
			meta: { target: ["name"] },
		});
		mockPrisma.collection.create.mockRejectedValue(p2002);
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe");
	});

	it("should generate slug from name", async () => {
		await createCollection(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalled();
	});

	it("should create collection in transaction", async () => {
		await createCollection(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.collection.create).toHaveBeenCalled();
	});

	it("should invalidate every tag returned by the helper after creation", async () => {
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockUpdateTag).toHaveBeenCalledWith("collections-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should succeed with valid data", async () => {
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return id and name in success data (for on-the-fly creation)", async () => {
		const result = await createCollection(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect((result as { data?: { id?: string; name?: string } }).data).toMatchObject({
			id: "col-1",
			name: "Nouvelle Collection",
		});
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createCollection(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
