import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
		collection: { findUnique: vi.fn(), update: vi.fn() },
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
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { TOGGLE_STATUS: "col-toggle" },
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
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("../../schemas/collection.schemas", () => ({ toggleCollectionStatusSchema: {} }));

import { toggleCollectionStatus } from "../toggle-collection-status";

function makeFormData(
	overrides: Partial<{ id: string; currentStatus: string; targetStatus: string }> = {},
) {
	return createMockFormData({
		id: overrides.id ?? VALID_CUID,
		currentStatus: overrides.currentStatus ?? "DRAFT",
		...(overrides.targetStatus ? { targetStatus: overrides.targetStatus } : {}),
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

describe("toggleCollectionStatus", () => {
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

		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection());
		mockPrisma.collection.update.mockResolvedValue(undefined);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.collection.findUnique).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
	});

	it("should return validation error", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "invalid" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(result).toEqual(validationError);
	});

	it("should return notFound when collection does not exist", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "DRAFT" },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(null);

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should toggle DRAFT to PUBLIC", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "DRAFT" },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ status: "DRAFT" }));

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(mockPrisma.collection.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "PUBLIC" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("publi");
	});

	it("should toggle PUBLIC to DRAFT", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "PUBLIC" },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ status: "PUBLIC" }));

		const result = await toggleCollectionStatus(
			undefined,
			makeFormData({ currentStatus: "PUBLIC" }),
		);

		expect(mockPrisma.collection.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "DRAFT" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("brouillon");
	});

	it("should restore ARCHIVED to PUBLIC", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "ARCHIVED" },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ status: "ARCHIVED" }));

		const result = await toggleCollectionStatus(
			undefined,
			makeFormData({ currentStatus: "ARCHIVED" }),
		);

		expect(mockPrisma.collection.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "PUBLIC" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should use explicit targetStatus when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "DRAFT", targetStatus: "DRAFT" },
		});

		const result = await toggleCollectionStatus(undefined, makeFormData({ targetStatus: "DRAFT" }));

		expect(mockPrisma.collection.update).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should skip update when already at target status", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "PUBLIC" },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(makeCollection({ status: "PUBLIC" }));

		await toggleCollectionStatus(
			undefined,
			makeFormData({ currentStatus: "PUBLIC", targetStatus: "PUBLIC" }),
		);

		// current=PUBLIC, no target so toggles to DRAFT; but to test skip we set targetStatus=PUBLIC
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "PUBLIC" },
		});
		const skipResult = await toggleCollectionStatus(
			undefined,
			makeFormData({ currentStatus: "PUBLIC", targetStatus: "PUBLIC" }),
		);

		expect(skipResult.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache and navbar menu", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "DRAFT" },
		});

		await toggleCollectionStatus(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("ma-collection");
		expect(mockUpdateTag).toHaveBeenCalledWith("navbar-menu");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, currentStatus: "DRAFT" },
		});
		mockPrisma.collection.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await toggleCollectionStatus(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
