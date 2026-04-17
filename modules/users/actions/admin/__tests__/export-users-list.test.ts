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
	mockLogAudit,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockBuildUsersListExport,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findMany: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockBuildUsersListExport: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { EXPORT_LIST: "user-export-list" },
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
	handleActionError: mockHandleActionError,
}));
vi.mock("../../../schemas/user-admin.schemas", () => ({ exportUsersListSchema: {} }));
vi.mock("../../../services/export-users-list-builder.service", () => ({
	buildUsersListExport: mockBuildUsersListExport,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID" },
}));

import { exportUsersList } from "../export-users-list";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(overrides: Record<string, string> = {}): FormData {
	const fd = new FormData();
	fd.set("format", overrides.format ?? "csv");
	if (overrides.role) fd.set("role", overrides.role);
	if (overrides.accountStatus) fd.set("accountStatus", overrides.accountStatus);
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("exportUsersList", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" },
		});
		mockValidateInput.mockImplementation((_s: unknown, data: unknown) => ({
			data: data as { format: "csv" | "json"; role?: string; accountStatus?: string },
		}));
		mockPrisma.user.findMany.mockResolvedValue([
			{
				id: "u1",
				email: "a@test.com",
				name: "Alice",
				role: "USER",
				accountStatus: "ACTIVE",
				createdAt: new Date("2026-03-01"),
				emailVerified: true,
				orders: [{ total: 5000 }, { total: 10000 }],
			},
			{
				id: "u2",
				email: "b@test.com",
				name: null,
				role: "USER",
				accountStatus: "ACTIVE",
				createdAt: new Date("2026-02-01"),
				emailVerified: false,
				orders: [],
			},
		]);
		mockBuildUsersListExport.mockReturnValue({
			filename: "users-2026-04-17.csv",
			mimeType: "text/csv;charset=utf-8",
			content: "csv-content",
		});
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
		const result = await exportUsersList(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "No" },
		});
		const result = await exportUsersList(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid format", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Bad format" },
		});
		const result = await exportUsersList(undefined, createFormData({ format: "xml" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should query with notDeleted filter", async () => {
		await exportUsersList(undefined, createFormData());
		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("should apply role filter when provided", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv", role: "ADMIN" } });
		await exportUsersList(undefined, createFormData({ role: "ADMIN" }));
		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ role: "ADMIN" }),
			}),
		);
	});

	it("should apply accountStatus filter when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { format: "json", accountStatus: "PENDING_DELETION" },
		});
		await exportUsersList(undefined, createFormData({ accountStatus: "PENDING_DELETION" }));
		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ accountStatus: "PENDING_DELETION" }),
			}),
		);
	});

	it("should cap results at 10 000 rows", async () => {
		await exportUsersList(undefined, createFormData());
		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10000 }));
	});

	it("should return error when no users match filters", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);
		const result = await exportUsersList(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Aucun utilisateur"));
		expect(mockBuildUsersListExport).not.toHaveBeenCalled();
	});

	it("should compute totalSpent from sum of order totals / 100", async () => {
		await exportUsersList(undefined, createFormData());
		const builderArg = mockBuildUsersListExport.mock.calls[0]![1] as Array<{
			id: string;
			ordersCount: number;
			totalSpent: number;
		}>;

		const alice = builderArg.find((u) => u.id === "u1")!;
		expect(alice.ordersCount).toBe(2);
		expect(alice.totalSpent).toBe(150); // (5000 + 10000) / 100

		const bob = builderArg.find((u) => u.id === "u2")!;
		expect(bob.ordersCount).toBe(0);
		expect(bob.totalSpent).toBe(0);
	});

	it("should forward format to the builder service", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "json" } });
		await exportUsersList(undefined, createFormData({ format: "json" }));
		expect(mockBuildUsersListExport).toHaveBeenCalledWith("json", expect.any(Array));
	});

	it("should log audit with count and format", async () => {
		await exportUsersList(undefined, createFormData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "user.exportList",
				targetType: "user",
				targetId: "list",
				metadata: expect.objectContaining({ count: 2, format: "csv" }),
			}),
		);
	});

	it("should return success with payload (filename/mime/content)", async () => {
		const result = await exportUsersList(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({
			filename: "users-2026-04-17.csv",
			mimeType: "text/csv;charset=utf-8",
			content: "csv-content",
		});
	});

	it("should report user count in success message", async () => {
		await exportUsersList(undefined, createFormData());
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("2 utilisateur"),
			expect.any(Object),
		);
	});

	it("should call handleActionError on unexpected crash", async () => {
		mockPrisma.user.findMany.mockRejectedValue(new Error("DB boom"));
		const result = await exportUsersList(undefined, createFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
