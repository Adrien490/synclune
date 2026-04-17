import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockUpdateTag,
	mockLogAudit,
	mockSuccess,
	mockError,
	mockNotFound,
	mockHandleActionError,
	mockGetUserFullInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetUserFullInvalidationTags: vi.fn(() => ["tag-a", "tag-b"]),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { SINGLE_OPERATIONS: "user-single" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../../schemas/user-admin.schemas", () => ({ toggleEmailVerifiedSchema: {} }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}));
vi.mock("../../../constants/cache", () => ({
	getUserFullInvalidationTags: mockGetUserFullInvalidationTags,
}));

import { toggleEmailVerified } from "../toggle-email-verified";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	Object.entries(data).forEach(([k, v]) => fd.set(k, v));
	return fd;
}

const validFormData = createFormData({ id: "tz4a98xxat96iws9zmbrgj3a" });

function baseUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "tz4a98xxat96iws9zmbrgj3a",
		name: "Alice",
		email: "alice@example.com",
		emailVerified: false,
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleEmailVerified", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" },
		});
		mockValidateInput.mockReturnValue({ data: { id: "tz4a98xxat96iws9zmbrgj3a" } });
		mockPrisma.user.findUnique.mockResolvedValue(baseUser());
		mockPrisma.user.update.mockResolvedValue({});
		mockLogAudit.mockResolvedValue(undefined);
		mockGetUserFullInvalidationTags.mockReturnValue(["tag-a", "tag-b"]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error first", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "No" },
		});
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid ID", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Bad ID" },
		});
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should refuse to modify a deleted user", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ deletedAt: new Date() }));
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("supprime"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should flip false -> true", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ emailVerified: false }));
		await toggleEmailVerified(undefined, validFormData);
		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "tz4a98xxat96iws9zmbrgj3a" },
			data: { emailVerified: true },
		});
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("verifie"));
	});

	it("should flip true -> false", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ emailVerified: true }));
		await toggleEmailVerified(undefined, validFormData);
		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "tz4a98xxat96iws9zmbrgj3a" },
			data: { emailVerified: false },
		});
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("retiree"));
	});

	it("should invalidate shared and per-user cache tags", async () => {
		await toggleEmailVerified(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("tz4a98xxat96iws9zmbrgj3a");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-a");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-b");
	});

	it("should log audit with previous/new values", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ emailVerified: false }));
		await toggleEmailVerified(undefined, validFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "user.toggleEmailVerified",
				targetType: "user",
				targetId: "tz4a98xxat96iws9zmbrgj3a",
				metadata: expect.objectContaining({
					previous: false,
					new: true,
					userEmail: "alice@example.com",
				}),
			}),
		);
	});

	it("should call handleActionError on unexpected crash", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB down"));
		const result = await toggleEmailVerified(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return success with user name in message", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ name: "Jean Valjean" }));
		await toggleEmailVerified(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Jean Valjean"));
	});

	it("should fall back to email when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(baseUser({ name: null }));
		await toggleEmailVerified(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("alice@example.com"));
	});
});
