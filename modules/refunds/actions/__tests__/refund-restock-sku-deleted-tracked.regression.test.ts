/**
 * @regression refund-restock-sku-deleted-tracked
 *
 * Garde-fou ORD-REFUND-AUDIT-001 : quand un SKU est soft-deleted entre la
 * création du refund (restock=true) et son processing, le `tx.productSku.update`
 * throw. Auparavant `.catch()` swallow silencieusement → stock perdu sans
 * trace. Le fix doit :
 *  1. Marquer le refund COMPLETED malgré l'échec restock (le client est bien
 *     remboursé, l'inventaire est une préoccupation ops séparée).
 *  2. Enrichir le metadata `OrderHistory.REFUND_COMPLETED` avec
 *     `skippedRestocks: [{ skuId, qty }]` pour audit forensic.
 *  3. Émettre une alerte Sentry `warning` avec tag `refund-restock` =
 *     `sku-missing` pour rattrapage manuel admin.
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
	mockTx,
	mockCreateStripeRefund,
	mockUpdateTag,
	mockSendRefundConfirmationEmail,
	mockBuildUrl,
	mockCreateOrderAuditTx,
	mockSentryCaptureMessage,
	mockSentryWithScope,
} = vi.hoisted(() => {
	const sentryScope = {
		setLevel: vi.fn(),
		setTag: vi.fn(),
		setFingerprint: vi.fn(),
		setContext: vi.fn(),
	};
	const mockSentryWithScope = vi.fn((cb: (scope: typeof sentryScope) => void) => cb(sentryScope));
	return {
		mockRequireAdminWithUser: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockPrisma: {
			$transaction: vi.fn(),
			refund: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn().mockResolvedValue(null) },
			productSku: { findMany: vi.fn().mockResolvedValue([]) },
			user: { findUnique: vi.fn() },
			order: { findUnique: vi.fn() },
			orderNote: { create: vi.fn().mockResolvedValue(undefined) },
		},
		mockTx: {
			$queryRaw: vi.fn(),
			refund: { update: vi.fn(), updateMany: vi.fn() },
			productSku: { update: vi.fn() },
			order: { update: vi.fn() },
			// ORD-STRIPE-007 : dispute.findFirst dans Step 1 SAGA processRefund
			dispute: { findFirst: vi.fn().mockResolvedValue(null) },
		},
		mockCreateStripeRefund: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockSendRefundConfirmationEmail: vi.fn(),
		mockBuildUrl: vi.fn((p: string) => `https://synclune.fr${p}`),
		mockCreateOrderAuditTx: vi.fn(),
		mockSentryCaptureMessage: vi.fn(),
		mockSentryWithScope,
	};
});

vi.mock("@sentry/nextjs", () => ({
	captureMessage: mockSentryCaptureMessage,
	withScope: mockSentryWithScope,
	// Logger Synclune (shared/lib/logger.ts) appelle addBreadcrumb + captureException
	addBreadcrumb: vi.fn(),
	captureException: vi.fn(),
	startSpan: (_opts: unknown, cb: () => unknown) => cb(),
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
vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: {
		SUCCESS: "success",
		ERROR: "error",
		NOT_FOUND: "not_found",
		UNAUTHORIZED: "unauthorized",
		FORBIDDEN: "forbidden",
		WARNING: "warning",
	},
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../lib/stripe-refund", () => ({ createStripeRefund: mockCreateStripeRefund }));
vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (id: string) => `/commandes/${id}` } },
}));
vi.mock("../../schemas/refund.schemas", () => ({ processRefundSchema: {} }));
vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		NOT_FOUND: "NF",
		ALREADY_PROCESSED: "AP",
		NOT_APPROVED: "NA",
		NO_CHARGE_ID: "NC",
		STRIPE_ERROR: "SE",
		PROCESS_FAILED: "PF",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "ol",
		USER_ORDERS: (id: string) => `u-${id}`,
		LAST_ORDER: (id: string) => `lo-${id}`,
		ACCOUNT_STATS: (id: string) => `as-${id}`,
		REFUNDS: (id: string) => `r-${id}`,
	},
	REFUNDS_CACHE_TAGS: { LIST: "rl", DETAIL: (id: string) => `rd-${id}` },
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "ab",
		ADMIN_ORDERS_LIST: "aol",
		ADMIN_INVENTORY_LIST: "ail",
	},
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (id: string) => `ss-${id}`,
		SKUS: (id: string) => `s-${id}`,
		DETAIL: (s: string) => `d-${s}`,
	},
}));
vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
	PaymentStatus: { REFUNDED: "REFUNDED", PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED" },
	RefundStatus: { FAILED: "FAILED", COMPLETED: "COMPLETED", APPROVED: "APPROVED" },
	HistorySource: { ADMIN: "ADMIN" },
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		REFUND_FAILED: "REFUND_FAILED",
	},
}));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("../../services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: vi.fn().mockResolvedValue({ kind: "noop", reason: "missing" }),
}));
vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordRefundEReporting: vi.fn().mockResolvedValue("skipped"),
}));

import { processRefund } from "../process-refund";

function makeFormData() {
	const fd = new FormData();
	fd.set("id", "refund-1");
	return fd;
}

function makeRefundRow() {
	return {
		id: "refund-1",
		status: "APPROVED",
		amount: 5000,
		reason: "CUSTOMER_REQUEST",
		attempt_count: 0,
		order_id: "order-1",
		order_number: "SYN-001",
		order_total: 10000,
		order_user_id: "user-1",
		stripe_payment_intent_id: "pi_123",
	};
}

const mockAdmin = { id: "admin-1", email: "admin@test.com", name: "Admin" };

describe("@regression refund-restock-sku-deleted-tracked — ORD-REFUND-AUDIT-001", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: mockAdmin });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ success: true, data: { id: "refund-1" } });
		mockSuccess.mockImplementation((msg: string) => ({ status: "success", message: msg }));
		mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: "error",
			message: msg,
		}));
		mockSendRefundConfirmationEmail.mockResolvedValue(undefined);
		mockPrisma.user.findUnique.mockResolvedValue({ email: "c@x.com", name: "Client" });
		mockTx.refund.updateMany.mockResolvedValue({ count: 1 });
		mockTx.order.update.mockResolvedValue({});

		// Step 1 (lock + read): query refund row + items
		// Step 3 (finalize transaction)
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockTx) => unknown) =>
			fn(mockTx),
		);
		mockCreateStripeRefund.mockResolvedValue({ success: true, refundId: "re_x" });
	});

	it("marks refund COMPLETED + records skippedRestocks in audit metadata + emits Sentry warning when SKU is deleted", async () => {
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([
				{ id: "ri-1", quantity: 2, restock: true, sku_id: "sku-deleted-1" },
				{ id: "ri-2", quantity: 1, restock: true, sku_id: "sku-ok" },
			])
			.mockResolvedValueOnce([]); // no previous completed refunds

		// sku-deleted-1 throws (SKU archived), sku-ok succeeds
		mockTx.productSku.update.mockImplementation((args: { where: { id: string } }) =>
			args.where.id === "sku-deleted-1"
				? Promise.reject(new Error("Record not found"))
				: Promise.resolve({}),
		);

		const result = await processRefund(undefined, makeFormData());

		expect(result.status).toBe("success");

		// Audit trail enrichi
		const auditCall = mockCreateOrderAuditTx.mock.calls.find(
			(c) => c[1]?.action === "REFUND_COMPLETED",
		);
		expect(auditCall).toBeDefined();
		expect(auditCall![1].metadata).toMatchObject({
			refundId: "refund-1",
			restockedSkuCount: 1,
			requestedRestockSkuCount: 2,
			skippedRestocks: [{ skuId: "sku-deleted-1", qty: 2 }],
		});

		// Sentry alerte avec fingerprint stable + tag
		expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
			expect.stringContaining("1 SKU restock skipped"),
			"warning",
		);
	});

	it("does NOT call Sentry when all SKU restocks succeed (no false positives)", async () => {
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([{ id: "ri-1", quantity: 1, restock: true, sku_id: "sku-ok" }])
			.mockResolvedValueOnce([]);

		mockTx.productSku.update.mockResolvedValue({});

		await processRefund(undefined, makeFormData());

		expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
		const auditCall = mockCreateOrderAuditTx.mock.calls.find(
			(c) => c[1]?.action === "REFUND_COMPLETED",
		);
		expect(auditCall![1].metadata).not.toHaveProperty("skippedRestocks");
		expect(auditCall![1].metadata.restockedSkuCount).toBe(1);
	});

	it("does NOT call Sentry when no items request restock (restock=false for all)", async () => {
		mockTx.$queryRaw
			.mockResolvedValueOnce([makeRefundRow()])
			.mockResolvedValueOnce([{ id: "ri-1", quantity: 1, restock: false, sku_id: "sku-1" }])
			.mockResolvedValueOnce([]);

		await processRefund(undefined, makeFormData());

		expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
		expect(mockTx.productSku.update).not.toHaveBeenCalled();
	});
});
