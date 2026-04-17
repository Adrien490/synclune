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
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockPrisma: {
		session: { deleteMany: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { BULK_OPERATIONS: "user-bulk" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/actions", () => ({
	parseFormIds: (formData: FormData) => {
		const raw = formData.get("ids");
		if (typeof raw !== "string" || !raw) return { ids: [] };
		try {
			const parsed = JSON.parse(raw);
			return { ids: Array.isArray(parsed) ? parsed : [] };
		} catch {
			return { error: { status: "VALIDATION_ERROR", message: "Format des IDs invalide." } };
		}
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../../schemas/user-admin.schemas", () => ({ bulkInvalidateSessionsSchema: {} }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}));

import { bulkInvalidateSessions } from "../bulk-invalidate-sessions";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(ids: string[]): FormData {
	const fd = new FormData();
	fd.set("ids", JSON.stringify(ids));
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkInvalidateSessions", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" },
		});
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}));
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 5 });
		mockLogAudit.mockResolvedValue(undefined);

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

	it("should return rate limit error first", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkInvalidateSessions(undefined, createFormData(["u1"]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "No" },
		});
		const result = await bulkInvalidateSessions(undefined, createFormData(["u1"]));
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
	});

	it("should return validation error for empty ids", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ids required" },
		});
		const result = await bulkInvalidateSessions(undefined, createFormData([]));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when only admin's own ID is provided", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-1"] } });
		const result = await bulkInvalidateSessions(undefined, createFormData(["admin-1"]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("propres"));
		expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
	});

	it("should filter out admin's own ID silently and process the rest", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-1", "user-2", "user-3"] } });
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 4 });

		const result = await bulkInvalidateSessions(
			undefined,
			createFormData(["admin-1", "user-2", "user-3"]),
		);

		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: { in: ["user-2", "user-3"] } },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({
			deletedSessions: 4,
			affectedUsers: 2,
			skippedSelf: 1,
		});
	});

	it("should invalidate all provided ids when admin's ID is not in the list", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["user-1", "user-2"] } });
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

		await bulkInvalidateSessions(undefined, createFormData(["user-1", "user-2"]));

		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: { in: ["user-1", "user-2"] } },
		});
	});

	it("should invalidate cache tags", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["user-1"] } });
		await bulkInvalidateSessions(undefined, createFormData(["user-1"]));
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should log audit with affected counts and skippedSelf", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-1", "user-2"] } });
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });

		await bulkInvalidateSessions(undefined, createFormData(["admin-1", "user-2"]));

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "user.bulkInvalidateSessions",
				targetType: "user",
				targetId: "user-2",
				metadata: expect.objectContaining({
					userCount: 1,
					sessionCount: 2,
					skippedSelf: 1,
				}),
			}),
		);
	});

	it("should handle malformed ids JSON", async () => {
		const fd = new FormData();
		fd.set("ids", "not-json");
		const result = await bulkInvalidateSessions(undefined, fd);
		expect(result.message).toBe("Format des IDs invalide.");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["user-1"] } });
		mockPrisma.session.deleteMany.mockRejectedValue(new Error("DB error"));
		const result = await bulkInvalidateSessions(undefined, createFormData(["user-1"]));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should include skippedSelf in success message when >0", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-1", "user-2"] } });
		await bulkInvalidateSessions(undefined, createFormData(["admin-1", "user-2"]));
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("ignore"), expect.any(Object));
	});
});
