/**
 * @regression refund-retry-anchor-preservation
 *
 * Garde-fou ORD-REFUND-AUDIT-002 : `retryFailedRefund` ne doit PAS effacer
 * `stripeRefundId` lors de la transition FAILED → APPROVED. La rotation
 * `attemptCount` produit une nouvelle clé d'idempotence Stripe ; clear
 * l'anchor ferait perdre la traçabilité reconcile et créerait un risque
 * théorique de double-débit si le précédent refund Stripe était en réalité
 * encore en `pending` au moment du retry admin.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		$transaction: vi.fn(),
		refund: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	REFUND_LIMITS: { PROCESS: "process" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, k: string) => {
		const v = fd.get(k);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		NOT_FOUND: "Not found",
		NOT_FAILED: "Not failed",
		RETRY_FAILED: "Retry failed",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "x",
		USER_ORDERS: (id: string) => `u-${id}`,
		REFUNDS: (id: string) => `r-${id}`,
	},
	REFUNDS_CACHE_TAGS: { LIST: "rl", DETAIL: (id: string) => `rd-${id}` },
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "ab" },
}));
vi.mock("../../schemas/refund.schemas", () => ({ retryFailedRefundSchema: {} }));
vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	HistorySource: { ADMIN: "ADMIN" },
	OrderAction: { REFUND_CREATED: "REFUND_CREATED" },
}));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("../../services/refund-state-machine.service", () => ({
	canTransition: () => true,
}));

import { retryFailedRefund } from "../retry-failed-refund";

describe("@regression refund-retry-anchor-preservation — ORD-REFUND-AUDIT-002", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", email: "a@b.c", name: "Admin" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ success: true, data: { id: "refund-1" } });
		mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
		mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: "error",
			message: msg,
		}));
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => Promise<void>) =>
			cb(mockPrisma),
		);
	});

	function makeFailedRefund(stripeRefundId: string | null = "re_previous_attempt") {
		return {
			id: "refund-1",
			status: "FAILED" as const,
			amount: 5000,
			failureReason: "insufficient_funds",
			stripeRefundId,
			order: { id: "order-1", orderNumber: "SYN-001", user: { id: "user-1" } },
		};
	}

	it("preserves stripeRefundId — data passed to updateMany has NO stripeRefundId key", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeFailedRefund("re_previous_attempt"));

		const fd = new FormData();
		fd.set("id", "refund-1");
		await retryFailedRefund(undefined, fd);

		const call = mockPrisma.refund.updateMany.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(call).toBeDefined();
		expect(call.data).not.toHaveProperty("stripeRefundId");
		expect(call.data).toEqual({
			status: "APPROVED",
			failureReason: null,
			attemptCount: { increment: 1 },
		});
	});

	it("increments attemptCount (Stripe idempotency key rotation)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeFailedRefund("re_x"));

		const fd = new FormData();
		fd.set("id", "refund-1");
		await retryFailedRefund(undefined, fd);

		const call = mockPrisma.refund.updateMany.mock.calls[0]?.[0] as {
			data: { attemptCount: { increment: number } };
		};
		expect(call.data.attemptCount).toEqual({ increment: 1 });
	});

	it("audit trail metadata includes previousFailureReason for forensic", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeFailedRefund("re_existing") as unknown as ReturnType<typeof makeFailedRefund>,
		);

		const fd = new FormData();
		fd.set("id", "refund-1");
		await retryFailedRefund(undefined, fd);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				metadata: expect.objectContaining({
					event: "retry_after_failure",
					previousFailureReason: "insufficient_funds",
					previousStatus: "FAILED",
					newStatus: "APPROVED",
				}),
			}),
		);
	});
});
