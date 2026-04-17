import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockPrisma,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockPrisma: {
		refund: { findMany: vi.fn() },
	},
	mockLogAudit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { EXPORT: "refund-export" },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, key: string) => {
		const v = fd.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));

vi.mock("../../schemas/refund.schemas", () => ({
	exportRefundsSchema: {},
}));

import { exportRefunds } from "../export-refunds";

// ============================================================================
// Fixtures
// ============================================================================

function makeFormData(period = "month", format = "csv", extras: Record<string, string> = {}) {
	const fd = new FormData();
	fd.set("period", period);
	fd.set("format", format);
	for (const [k, v] of Object.entries(extras)) fd.set(k, v);
	return fd;
}

function makeRefundRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		amount: 5000,
		currency: "EUR",
		status: "COMPLETED",
		reason: "CUSTOMER_REQUEST",
		stripeRefundId: "re_abc",
		note: null,
		failureReason: null,
		createdAt: new Date("2026-04-10T12:00:00Z"),
		processedAt: new Date("2026-04-10T14:00:00Z"),
		order: {
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			customerName: "Marie Dupont",
		},
		_count: { items: 2 },
		...overrides,
	};
}

const mockAdmin = { id: "admin-1", email: "admin@test.com", name: "Admin" };

// ============================================================================
// Tests
// ============================================================================

describe("exportRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: mockAdmin });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { period: "month", format: "csv" },
		});
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockPrisma.refund.findMany.mockResolvedValue([]);
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await exportRefunds(undefined, makeFormData());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await exportRefunds(undefined, makeFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid period or format", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await exportRefunds(undefined, makeFormData("bogus"));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("queries refunds with period date filter for '7d'", async () => {
		mockValidateInput.mockReturnValue({ data: { period: "7d", format: "csv" } });
		await exportRefunds(undefined, makeFormData("7d"));

		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			where: { createdAt?: { gte: Date } };
		};
		expect(call.where.createdAt?.gte).toBeInstanceOf(Date);
	});

	it("omits date filter for period 'all'", async () => {
		mockValidateInput.mockReturnValue({ data: { period: "all", format: "csv" } });
		await exportRefunds(undefined, makeFormData("all"));

		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			where: { createdAt?: unknown };
		};
		expect(call.where.createdAt).toBeUndefined();
	});

	it("applies status filter when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { period: "all", format: "csv", status: "FAILED" },
		});
		await exportRefunds(undefined, makeFormData("all", "csv", { status: "FAILED" }));

		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			where: { status: string };
		};
		expect(call.where.status).toBe("FAILED");
	});

	it("applies reason filter when provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { period: "all", format: "csv", reason: "FRAUD" },
		});
		await exportRefunds(undefined, makeFormData("all", "csv", { reason: "FRAUD" }));

		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			where: { reason: string };
		};
		expect(call.where.reason).toBe("FRAUD");
	});

	it("caps the query at EXPORT_MAX_ROWS (10000)", async () => {
		await exportRefunds(undefined, makeFormData());
		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as { take: number };
		expect(call.take).toBe(10000);
	});

	it("excludes soft-deleted rows", async () => {
		await exportRefunds(undefined, makeFormData());
		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			where: { deletedAt: null };
		};
		expect(call.where.deletedAt).toBeNull();
	});

	it("returns success with CSV payload", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([makeRefundRow()]);
		const result = await exportRefunds(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		const data = result.data as { filename: string; mimeType: string; content: string };
		expect(data.mimeType).toBe("text/csv;charset=utf-8");
		expect(data.filename).toMatch(/\.csv$/);
		expect(data.content).toContain("SYN-001");
	});

	it("returns success with JSON payload when format is json", async () => {
		mockValidateInput.mockReturnValue({ data: { period: "all", format: "json" } });
		mockPrisma.refund.findMany.mockResolvedValue([makeRefundRow()]);
		const result = await exportRefunds(undefined, makeFormData("all", "json"));

		const data = result.data as { filename: string; mimeType: string; content: string };
		expect(data.mimeType).toBe("application/json;charset=utf-8");
		expect(data.filename).toMatch(/\.json$/);
		const parsed = JSON.parse(data.content);
		expect(parsed.count).toBe(1);
	});

	it("handles empty result set", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([]);
		const result = await exportRefunds(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("0");
	});

	it("logs audit with period, format, rowCount", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([makeRefundRow(), makeRefundRow()]);
		await exportRefunds(undefined, makeFormData());

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "refund.export",
				targetType: "refund",
				targetId: "bulk",
				metadata: expect.objectContaining({
					period: "month",
					format: "csv",
					rowCount: 2,
				}),
			}),
		);
	});

	it("sorts by createdAt descending", async () => {
		await exportRefunds(undefined, makeFormData());
		const call = mockPrisma.refund.findMany.mock.calls[0]?.[0] as {
			orderBy: { createdAt: string };
		};
		expect(call.orderBy.createdAt).toBe("desc");
	});

	it("delegates unexpected errors to handleActionError", async () => {
		mockPrisma.refund.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await exportRefunds(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
