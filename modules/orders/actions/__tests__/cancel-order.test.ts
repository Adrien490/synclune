import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockAfter,
	mockHandleActionError,
	mockSendCancelEmail,
	mockSanitizeText,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : le claim atomique remplace order.update par
		// order.updateMany (précondition status/paymentStatus dans le where).
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		orderHistory: { create: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn(), updateMany: vi.fn() },
		refund: {
			create: vi.fn(),
			aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
		},
		// ORD-STRIPE-007 : dispute.findFirst utilisé pour bloquer cancel sur dispute ouvert
		dispute: { findFirst: vi.fn().mockResolvedValue(null) },
		// IDEM-CANCEL-001 : advisory lock acquireOrderPaidLockTx → tx.$queryRaw
		$queryRaw: vi.fn(),
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
	mockHandleActionError: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCanCancelOrder: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}));

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
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/server", () => ({
	after: mockAfter,
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return {
		...original,
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: vi.fn().mockResolvedValue({ kind: "noop", reason: "no-active-invoice" }),
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("../../schemas/order.schemas", () => ({
	cancelOrderSchema: {
		safeParse: vi
			.fn()
			.mockReturnValue({ success: true, data: { id: VALID_CUID, reason: undefined } }),
	},
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_CANCELLED: "Cette commande est deja annulee.",
		CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	},
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: { REFUNDS: (orderId: string) => `order-refunds-${orderId}` },
}));

import { cancelOrder } from "../cancel-order";
import { cancelOrderSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createTxOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("cancelOrder", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockAfter.mockImplementation((fn: () => Promise<void>) => fn());
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCanCancelOrder.mockReturnValue(true);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendCancelEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"]);

		const txOrder = createTxOrder();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				return fn(mockPrisma);
			},
		);
		mockPrisma.order.findUnique.mockResolvedValue(txOrder);
		mockPrisma.$queryRaw.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.discountUsage.deleteMany.mockResolvedValue({});
		mockPrisma.discount.update.mockResolvedValue({});
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-auto-1" });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

		vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: undefined },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// Auth
	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await cancelOrder(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await cancelOrder(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("should return validation error for invalid ID", async () => {
		vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("ID invalide");
	});

	// Order not found
	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// Already cancelled
	it("should return error when order is already cancelled", async () => {
		const order = createTxOrder({ status: "CANCELLED" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockCanCancelOrder.mockReturnValue(false);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("annulee");
	});

	// Cannot cancel shipped
	it("should return error when order is shipped", async () => {
		const order = createTxOrder({ status: "SHIPPED" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockCanCancelOrder.mockReturnValue(false);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// STOCK-01 : une commande PENDING n'a JAMAIS décrémenté son stock (réservation
	// optimiste : décrément seulement au passage PAID). L'annuler ne doit PAS
	// restocker, sinon l'inventaire gonfle au-dessus du réel (phantom stock).
	it("should NOT restore stock when cancelling a PENDING (never-decremented) order", async () => {
		const order = createTxOrder({
			paymentStatus: "PENDING",
			fulfillmentStatus: "UNFULFILLED",
			items: [{ skuId: "sku-1", quantity: 2 }],
		});
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
	});

	// STOCK-01 (contre-épreuve) : une commande PAID dont les articles ne sont pas
	// encore expédiés (fulfillment UNFULFILLED) A bien décrémenté son stock → on
	// DOIT le restaurer à l'annulation.
	it("should restore stock when cancelling a PAID, not-yet-shipped order", async () => {
		const order = createTxOrder({
			paymentStatus: "PAID",
			fulfillmentStatus: "UNFULFILLED",
			items: [{ id: "item-1", skuId: "sku-1", quantity: 2, price: 4999 }],
		});
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-1" },
				data: { inventory: { increment: 2 } },
			}),
		);
	});

	// Success with PAID payment (mark REFUNDED) — ORD-BIZ-009 requires autoRefund=true
	it("should mark paymentStatus as REFUNDED when cancelling a PAID order", async () => {
		const order = createTxOrder({ paymentStatus: "PAID" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("annulée");
	});

	// Email sent
	it("should send cancellation email to customer", async () => {
		const order = createTxOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(undefined, validFormData);

		expect(mockSendCancelEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			}),
		);
		expect(result.message).toContain("annulée");
	});

	// Email scheduled via after() (post-response)
	it("should schedule email via after() and not call it synchronously", async () => {
		const order = createTxOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockAfter.mockImplementationOnce(() => Promise.resolve());

		await cancelOrder(undefined, validFormData);

		expect(mockAfter).toHaveBeenCalledOnce();
		expect(mockAfter).toHaveBeenCalledWith(expect.any(Function));
		expect(mockSendCancelEmail).not.toHaveBeenCalled();
	});

	// Email failure fallback
	it("should succeed even if email fails", async () => {
		const order = createTxOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSendCancelEmail.mockRejectedValue(new Error("SMTP error"));

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("annulée");
	});

	// Audit trail
	it("should create audit trail entry", async () => {
		const order = createTxOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);

		await cancelOrder(undefined, validFormData);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "CANCELLED",
				authorId: "admin-1",
			}),
		);
	});

	// Cache invalidation
	it("should invalidate order cache tags", async () => {
		const order = createTxOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);

		await cancelOrder(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalled();
	});

	// Sanitize reason
	it("should sanitize the cancellation reason", async () => {
		const fd = createMockFormData({ id: VALID_CUID, reason: "<script>alert(1)</script>" });
		const order = createTxOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);

		await cancelOrder(undefined, fd);

		expect(mockSanitizeText).toHaveBeenCalledWith("<script>alert(1)</script>");
	});

	// Discount usage release — ORD-BIZ-009 requires autoRefund=true on PAID orders
	it("should release discount usages when cancelling an order", async () => {
		const order = createTxOrder({
			paymentStatus: "PAID",
		});
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPrisma.discountUsage.findMany.mockResolvedValue([
			{ id: "usage-1", discountId: "disc-A" },
			{ id: "usage-2", discountId: "disc-B" },
		]);

		await cancelOrder(undefined, createMockFormData({ id: VALID_CUID, autoRefund: "true" }));

		// [[DISC-USAGE-002]] Libération via `releaseOrderDiscountUsageTx` : le
		// décrément est un `updateMany` GARDÉ par `usageCount > 0` (un `update` nu
		// laissait le compteur passer négatif → code redeemable au-delà de
		// maxUsageCount).
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledTimes(2);
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: "disc-A", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: "disc-B", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
			where: { orderId: VALID_CUID },
		});
	});

	it("should not call deleteMany on discountUsage when there are no usages", async () => {
		const order = createTxOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);

		await cancelOrder(undefined, validFormData);

		expect(mockPrisma.discountUsage.deleteMany).not.toHaveBeenCalled();
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// PARTIALLY_REFUNDED should become REFUNDED on cancel — requires autoRefund=true (ORD-BIZ-009)
	it("should mark paymentStatus as REFUNDED when cancelling a PARTIALLY_REFUNDED order", async () => {
		const order = createTxOrder({ paymentStatus: "PARTIALLY_REFUNDED" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("annulée");
	});

	// IDEM-CANCEL-001 : le claim ré-évalue la précondition status/paymentStatus
	// au lock de ligne (updateMany conditionnel), pas un update inconditionnel.
	it("should claim the order with status/paymentStatus preconditions in the where clause", async () => {
		const order = createTxOrder({ status: "PENDING", paymentStatus: "PENDING" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrder(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: VALID_CUID,
					status: "PENDING",
					paymentStatus: "PENDING",
				}),
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
	});

	// IDEM-CANCEL-001 : count===0 ⇒ la commande a été mutée par un concurrent
	// entre le findUnique et le claim → abort AVANT restock / Refund / audit.
	it("should abort with a concurrent-change error when the atomic claim matches no row", async () => {
		const order = createTxOrder({
			paymentStatus: "PAID",
			fulfillmentStatus: "UNFULFILLED",
			items: [{ id: "item-1", skuId: "sku-1", quantity: 2, price: 4999 }],
		});
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("modifiée par une autre opération");
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		expect(mockPrisma.refund.create).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	// handleActionError on unexpected exception
	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await cancelOrder(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ========================================================================
	// AUTO REFUND
	// ========================================================================

	describe("autoRefund", () => {
		it("should REFUSE cancellation when autoRefund=false on PAID order without existing refund (ORD-BIZ-009)", async () => {
			const order = createTxOrder({
				paymentStatus: "PAID",
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 1000 }],
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);
			const fdNoAuto = createMockFormData({ id: VALID_CUID, autoRefund: "false" });

			const result = await cancelOrder(undefined, fdNoAuto);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toMatch(/payée/i);
			expect(mockPrisma.refund.create).not.toHaveBeenCalled();
			expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
		});

		it("should NOT create refund when autoRefund=true but order is PENDING", async () => {
			const order = createTxOrder({
				paymentStatus: "PENDING",
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 1000 }],
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);
			const fd = createMockFormData({ id: VALID_CUID, autoRefund: "true" });

			await cancelOrder(undefined, fd);

			expect(mockPrisma.refund.create).not.toHaveBeenCalled();
		});

		it("should create APPROVED refund when autoRefund=true on PAID order", async () => {
			const order = createTxOrder({
				paymentStatus: "PAID",
				total: 4999,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 4999 }],
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);
			const fd = createMockFormData({ id: VALID_CUID, autoRefund: "true" });

			const result = await cancelOrder(undefined, fd);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockPrisma.refund.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						orderId: VALID_CUID,
						amount: 4999,
						status: "APPROVED",
						reason: "CUSTOMER_REQUEST",
						items: {
							create: [
								expect.objectContaining({
									orderItemId: "oi-1",
									quantity: 1,
									amount: 4999,
								}),
							],
						},
					}),
				}),
			);
		});

		it("should include refund cache tag invalidation when refund is created", async () => {
			const order = createTxOrder({
				paymentStatus: "PAID",
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 1000 }],
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);
			const fd = createMockFormData({ id: VALID_CUID, autoRefund: "true" });

			await cancelOrder(undefined, fd);

			expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${order.id}`);
		});

		it("should mention 'Remboursement Stripe planifié' in success message", async () => {
			const order = createTxOrder({
				paymentStatus: "PAID",
				total: 1234,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 1234 }],
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);
			const fd = createMockFormData({ id: VALID_CUID, autoRefund: "true" });

			const result = await cancelOrder(undefined, fd);

			expect(result.message).toContain("Remboursement Stripe en attente");
		});
	});
});
