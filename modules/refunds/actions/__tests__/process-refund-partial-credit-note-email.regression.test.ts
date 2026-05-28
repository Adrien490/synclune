/**
 * @regression process-refund-partial-credit-note-email
 *
 * Garde EINV-CREDIT-001 : pour un remboursement **partiel** réussi, l'email de
 * confirmation client doit mentionner le numéro d'avoir A-YYYY-NNNNN émis sur
 * `Refund.creditNoteNumber` (PAS `Order.creditNoteNumber` qui reste null en
 * partial). Le bug régression : process-refund lisait `prisma.order.findUnique`
 * → email envoyé avec `creditNoteNumber: null` (message générique sans avoir),
 * alors que l'avoir A-YYYY-NNNNN existait bien sur le Refund.
 *
 * Fix : process-refund.ts lit désormais `prisma.refund.findUnique` avec un
 * select sur `creditNoteNumber + order.{invoiceNumber, creditNoteNumber}`, et
 * applique le fallback `refund.creditNoteNumber ?? order.creditNoteNumber`.
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
} = vi.hoisted(() => {
	const mockTx = {
		$queryRaw: vi.fn(),
		refund: { update: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		order: { update: vi.fn() },
		// ORD-STRIPE-007 : dispute.findFirst utilisé dans Step 1 du SAGA processRefund
		dispute: { findFirst: vi.fn().mockResolvedValue(null) },
	};
	return {
		mockRequireAdminWithUser: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockPrisma: {
			$transaction: vi.fn(),
			refund: {
				update: vi.fn(),
				updateMany: vi.fn(),
				findUnique: vi.fn(),
			},
			productSku: { findMany: vi.fn() },
			user: { findUnique: vi.fn() },
			order: { findUnique: vi.fn() },
			orderNote: { create: vi.fn() },
		},
		mockTx,
		mockCreateStripeRefund: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockSendRefundConfirmationEmail: vi.fn().mockResolvedValue(undefined),
		mockBuildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	};
});

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ REFUND_LIMITS: { PROCESS: "process" } }));
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
vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: { SUCCESS: "success", ERROR: "error", NOT_FOUND: "not_found" },
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
		NOT_FOUND: "x",
		ALREADY_PROCESSED: "x",
		NOT_APPROVED: "x",
		NO_CHARGE_ID: "x",
		STRIPE_ERROR: "x",
		PROCESS_FAILED: "x",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (u: string) => `orders-user-${u}`,
		LAST_ORDER: (u: string) => `last-order-${u}`,
		ACCOUNT_STATS: (u: string) => `stats-${u}`,
		REFUNDS: (o: string) => `order-refunds-${o}`,
	},
	REFUNDS_CACHE_TAGS: { LIST: "refunds-list", DETAIL: (id: string) => `refund-${id}` },
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_ORDERS_LIST: "admin-orders-list",
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
	},
}));
vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (s: string) => `sku-${s}`,
		SKUS: (p: string) => `skus-${p}`,
		DETAIL: (s: string) => `product-${s}`,
	},
}));
vi.mock("@/modules/dashboard/constants/cache", () => ({}));
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
vi.mock("@/modules/orders/utils/order-audit", () => ({ createOrderAuditTx: vi.fn() }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordRefundEReporting: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../services/issue-credit-note.service", () => ({
	// On simule l'émission réussie de l'avoir partiel — c'est l'effet observable
	// (via prisma.refund.findUnique post-Step 3) qui est testé ici.
	issueCreditNoteForRefund: vi.fn().mockResolvedValue({
		kind: "issued",
		creditNoteNumber: "A-2026-00042",
		creditNoteGeneratedAt: new Date(),
	}),
}));
vi.mock("../utils/capture-refund-error", () => ({ captureRefundError: vi.fn() }));

import { processRefund } from "../process-refund";

function makeFormData(id = "refund-partial-1") {
	const fd = new FormData();
	fd.set("id", id);
	return fd;
}

const ADMIN = {
	id: "admin-1",
	email: "admin@synclune.fr",
	name: "Admin Test",
	role: "ADMIN",
};

describe("@regression process-refund-partial-credit-note-email — EINV-CREDIT-001", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN });
		mockEnforceRateLimit.mockResolvedValue({});
		mockValidateInput.mockReturnValue({ data: { id: "refund-partial-1" } });
		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: "success",
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({ status: "error", message }));

		// Step 1 lookup
		mockPrisma.$transaction.mockImplementationOnce(async () => ({
			refund: {
				id: "refund-partial-1",
				status: "APPROVED",
				amount: 3000,
				reason: "CUSTOMER_REQUEST",
				attempt_count: 0,
				order_id: "order-1",
				order_number: "SYN-2026-1234",
				order_total: 10000, // partiel : 3000 / 10000
				order_user_id: "user-1",
				order_currency: "EUR",
				stripe_payment_intent_id: "pi_test_001",
			},
			items: [],
			totalRefundedBefore: 0,
		}));

		// Step 2 stripe
		mockCreateStripeRefund.mockResolvedValue({
			success: true,
			pending: false,
			refundId: "re_test_001",
			status: "succeeded",
		});

		// Step 2.5 persist stripeRefundId
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		// Step 3 finalize (transaction atomique) — pas d'items à restocker
		mockPrisma.$transaction.mockImplementationOnce(
			async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
				mockTx.refund.updateMany.mockResolvedValue({ count: 1 });
				mockTx.order.update.mockResolvedValue({ id: "order-1" });
				await cb(mockTx);
				return undefined;
			},
		);

		// Email lookup : user + refund
		mockPrisma.user.findUnique.mockResolvedValue({
			email: "client@example.com",
			name: "Marie Dupont",
		});
	});

	it("partial: Refund.creditNoteNumber='A-2026-00042' + Order.creditNoteNumber=null → email reçoit creditNoteNumber='A-2026-00042'", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00042",
			order: { invoiceNumber: "F-2026-12345", creditNoteNumber: null },
		});

		await processRefund(undefined, makeFormData());
		// flush microtasks (sendRefundConfirmationEmail est non-awaited)
		await new Promise((r) => setImmediate(r));

		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-1234",
				refundAmount: 3000,
				creditNoteNumber: "A-2026-00042",
				invoiceNumber: "F-2026-12345",
			}),
		);
	});

	it("full refund (rétro-compat) : Refund.creditNoteNumber=null + Order.creditNoteNumber='A-2026-00099' → email reçoit Order.creditNoteNumber", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: null,
			order: { invoiceNumber: "F-2026-12345", creditNoteNumber: "A-2026-00099" },
		});

		await processRefund(undefined, makeFormData());
		await new Promise((r) => setImmediate(r));

		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				creditNoteNumber: "A-2026-00099",
				invoiceNumber: "F-2026-12345",
			}),
		);
	});

	it("priorité Refund.creditNoteNumber sur Order.creditNoteNumber (avoir le plus récent gagne)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00100", // avoir refund (plus récent)
			order: { invoiceNumber: "F-2026-12345", creditNoteNumber: "A-2026-00050" },
		});

		await processRefund(undefined, makeFormData());
		await new Promise((r) => setImmediate(r));

		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({ creditNoteNumber: "A-2026-00100" }),
		);
	});

	it("aucun avoir nulle part (cas erreur émission) → email envoyé avec creditNoteNumber=null (graceful)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: null,
			order: { invoiceNumber: "F-2026-12345", creditNoteNumber: null },
		});

		await processRefund(undefined, makeFormData());
		await new Promise((r) => setImmediate(r));

		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				creditNoteNumber: null,
				invoiceNumber: "F-2026-12345",
			}),
		);
	});

	it("refund.findUnique lit Refund.creditNoteNumber + Order via select relationnel (pas Order.findUnique direct)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({
			creditNoteNumber: "A-2026-00042",
			order: { invoiceNumber: "F-2026-12345", creditNoteNumber: null },
		});

		await processRefund(undefined, makeFormData());
		await new Promise((r) => setImmediate(r));

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith({
			where: { id: "refund-partial-1" },
			select: {
				creditNoteNumber: true,
				order: { select: { invoiceNumber: true, creditNoteNumber: true } },
			},
		});
		// Important : on n'utilise plus prisma.order.findUnique pour résoudre l'avoir
		// (le legacy `order.findUnique` n'est plus dans le path email).
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});
});
