/**
 * @regression ORD-BIZ-009
 *
 * Garantit que `cancelOrder` refuse d'annuler une commande PAID/PARTIALLY_REFUNDED
 * quand `autoRefund=false` ET qu'aucun Refund DB ne couvre déjà le total.
 *
 * Sans cette régression : `paymentStatus` serait posé à `REFUNDED` sans aucun
 * Refund créé → commande affichée « Remboursée » sans trace Stripe/DB
 * (faux-positif comptable, litige client garanti).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

const {
	mockPrisma,
	mockTx,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
	mockBuildUrl,
	mockSanitizeText,
	mockSendCancelEmail,
	mockVoidInvoice,
} = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn() },
		orderHistory: { create: vi.fn() },
		discountUsage: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		refund: {
			create: vi.fn(),
			aggregate: vi.fn(),
		},
		// ORD-STRIPE-007 : dispute.findFirst dans cancelOrder Step initial
		dispute: { findFirst: vi.fn().mockResolvedValue(null) },
	};
	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
		},
		mockRequireAdminWithUser: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockCanCancelOrder: vi.fn().mockReturnValue(true),
		mockCreateOrderAuditTx: vi.fn(),
		mockGetOrderInvalidationTags: vi.fn().mockReturnValue([]),
		mockBuildUrl: vi.fn().mockReturnValue("https://synclune.fr/orders/1"),
		mockSanitizeText: vi.fn((s: string) => s),
		mockSendCancelEmail: vi.fn(),
		mockVoidInvoice: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));

vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/server", () => ({
	after: vi.fn((fn: () => Promise<void>) => fn()),
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn(),
	captureMessage: vi.fn(),
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return { ...original };
});

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/modules/orders/utils/customer-name", () => ({
	extractCustomerFirstName: vi.fn().mockReturnValue("Client"),
}));

import { cancelOrder } from "../cancel-order";

describe("ORD-BIZ-009 — cancel-order refuse autoRefund=false sur PAID sans refund existant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockCanCancelOrder.mockReturnValue(true);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
	});

	it("refuse l'annulation d'une commande PAID si autoRefund=false ET aucun Refund existant", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "PROCESSING",
				total: 5000,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 5000 }],
			}),
		);
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

		const formData = createMockFormData({ id: VALID_CUID, autoRefund: "false", reason: "test" });
		const result = await cancelOrder(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/payée/i);
		expect(result.message).toMatch(/Auto-refund/i);
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockTx.refund.create).not.toHaveBeenCalled();
	});

	it("refuse l'annulation d'une commande PARTIALLY_REFUNDED si autoRefund=false sans solde couvert", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PARTIALLY_REFUNDED",
				fulfillmentStatus: "PROCESSING",
				total: 10000,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 10000 }],
			}),
		);
		// Refund existant pour 3000 seulement — il reste 7000 à rembourser
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 3000 } });

		const formData = createMockFormData({ id: VALID_CUID, autoRefund: "false", reason: "test" });
		const result = await cancelOrder(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/payée/i);
	});

	it("autorise l'annulation si autoRefund=false ET un Refund DB couvre déjà le total", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "PROCESSING",
				total: 5000,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 5000 }],
			}),
		);
		// Refund existant couvre tout le total
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
		mockTx.order.update.mockResolvedValue({});

		const formData = createMockFormData({ id: VALID_CUID, autoRefund: "false", reason: "test" });
		const result = await cancelOrder(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockTx.order.update).toHaveBeenCalled();
	});

	it("autorise l'annulation si autoRefund=true sur PAID (création Refund automatique)", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "PROCESSING",
				total: 5000,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 5000 }],
			}),
		);
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-auto-1" });
		mockTx.order.update.mockResolvedValue({});

		const formData = createMockFormData({ id: VALID_CUID, autoRefund: "true", reason: "test" });
		const result = await cancelOrder(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockTx.refund.create).toHaveBeenCalled();
	});

	it("autorise l'annulation d'une commande PENDING (paiement non abouti) même autoRefund=false", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PENDING",
				paymentStatus: "PENDING",
				fulfillmentStatus: "UNFULFILLED",
				total: 5000,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 5000 }],
			}),
		);
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.order.update.mockResolvedValue({});

		const formData = createMockFormData({ id: VALID_CUID, autoRefund: "false", reason: "test" });
		const result = await cancelOrder(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockTx.refund.create).not.toHaveBeenCalled();
	});
});
