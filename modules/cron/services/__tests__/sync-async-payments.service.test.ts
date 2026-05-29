import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTag } from "next/cache";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockProcessOrderFromPaymentIntent,
	mockEnsureInvoiceNumberPersisted,
	mockRecordSalesEReporting,
	mockExtractPaymentMethodFromPaymentIntent,
	mockMarkOrderAsFailed,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockStripe: {
		paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockProcessOrderFromPaymentIntent: vi.fn(),
	mockEnsureInvoiceNumberPersisted: vi.fn(),
	mockRecordSalesEReporting: vi.fn(),
	mockExtractPaymentMethodFromPaymentIntent: vi.fn(),
	mockMarkOrderAsFailed: vi.fn(),
	mockExtractPaymentFailureDetails: vi.fn(),
	mockRestoreStockForOrder: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
}));

vi.mock("@/modules/webhooks/services/payment-intent.service", () => ({
	markOrderAsFailed: mockMarkOrderAsFailed,
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
}));

vi.mock("@/modules/webhooks/services/checkout.service", () => ({
	processOrderFromPaymentIntent: mockProcessOrderFromPaymentIntent,
}));

vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	ensureInvoiceNumberPersisted: mockEnsureInvoiceNumberPersisted,
}));

vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordSalesEReporting: mockRecordSalesEReporting,
}));

vi.mock("@/modules/payments/services/map-stripe-payment-method", () => ({
	extractPaymentMethodFromPaymentIntent: mockExtractPaymentMethodFromPaymentIntent,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

import { syncAsyncPayments } from "../sync-async-payments.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

describe("syncAsyncPayments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockStripe.paymentIntents.cancel.mockResolvedValue({ status: "canceled" });
		mockRestoreStockForOrder.mockResolvedValue({ restoredSkuIds: [] });
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockProcessOrderFromPaymentIntent.mockResolvedValue(undefined);
		mockEnsureInvoiceNumberPersisted.mockResolvedValue(undefined);
		mockRecordSalesEReporting.mockResolvedValue(undefined);
		mockExtractPaymentMethodFromPaymentIntent.mockResolvedValue(undefined);
	});

	it("should return skipped result with STRIPE_KEY_MISSING reason when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await syncAsyncPayments();

		expect(result).toEqual({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("should return zero counts when no pending orders exist", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await syncAsyncPayments();

		expect(result).toMatchObject({ checked: 0, updated: 0, errors: 0, hasMore: false });
	});

	it("F4: should query PENDING+PI orders older than 1h with NO upper age bound, oldest first", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await syncAsyncPayments();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.paymentStatus).toBe("PENDING");
		expect(call.where.stripePaymentIntentId).toEqual({ not: null });
		expect(call.where.deletedAt).toBeNull();

		const minAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS);
		expect(call.where.createdAt.lt.getTime()).toBe(minAge.getTime());
		// F4 : la borne haute (10j) est retirée — un PI succeeded de tout âge doit
		// être réconcilié (débit orphelin sinon). On traite les plus anciens d'abord.
		expect(call.where.createdAt.gte).toBeUndefined();
		expect(call.orderBy).toEqual({ createdAt: "asc" });
	});

	it("should process order via the webhook path when Stripe shows succeeded", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
		};
		const paymentIntent = { id: "pi_success", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);

		const result = await syncAsyncPayments();

		// ORD-STRIPE-001 : décrément stock garanti via processOrderFromPaymentIntent
		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith(
			"order-1",
			paymentIntent,
			undefined,
		);
		expect(mockEnsureInvoiceNumberPersisted).toHaveBeenCalledWith("order-1");
		expect(mockRecordSalesEReporting).toHaveBeenCalledWith("order-1");
		expect(result!.updated).toBe(1);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	// CACHE-AUDIT-004 : confirmation async → l'espace client doit refléter PAID
	// immédiatement (tags user-scopés + détail), pas après expiration du profil.
	it("CACHE-AUDIT-004: should invalidate user-scoped + order-detail tags on success", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
			userId: "user-9",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ id: "pi_success", status: "succeeded" });

		await syncAsyncPayments();

		const invalidated = vi.mocked(updateTag).mock.calls.map((c) => c[0]);
		expect(invalidated).toContain("order-detail-order-1");
		expect(invalidated).toContain("orders-user-user-9");
		expect(invalidated).toContain("last-order-user-user-9");
	});

	// ORD-STRIPE-001 régression : si le webhook async_payment_succeeded est perdu,
	// le cron doit déclencher le même flow que le webhook (décrément stock inclus).
	it("ORD-STRIPE-001: should propagate the resolved paymentMethod to processOrderFromPaymentIntent", async () => {
		const order = {
			id: "order-card",
			orderNumber: "SYN-CARD",
			stripePaymentIntentId: "pi_card_success",
			paymentStatus: "PENDING",
		};
		const paymentIntent = { id: "pi_card_success", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntent);
		mockExtractPaymentMethodFromPaymentIntent.mockResolvedValue("CARD");

		await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith(
			"order-card",
			paymentIntent,
			"CARD",
		);
	});

	it("should mark order as failed and restore stock when Stripe shows canceled", async () => {
		const order = {
			id: "order-2",
			orderNumber: "SYN-002",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith("order-2", "pi_canceled", failureDetails);
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-2");
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should mark order as failed when Stripe shows requires_payment_method", async () => {
		const order = {
			id: "order-3",
			orderNumber: "SYN-003",
			stripePaymentIntentId: "pi_needs_method",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "requires_payment_method",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-3");
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	// F1 (2026-05-29) : PI 3DS abandonné / jamais confirmé → cancel Stripe PUIS FAILED.
	it("F1: should cancel the PI then mark FAILED when Stripe shows requires_action", async () => {
		const order = {
			id: "order-3ds",
			orderNumber: "SYN-3DS",
			stripePaymentIntentId: "pi_requires_action",
			paymentStatus: "PENDING",
			userId: "user-3ds",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			id: "pi_requires_action",
			status: "requires_action",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_requires_action");
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-3ds");
		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith("order-3ds", "pi_requires_action", {});
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	it("F1: should cancel the PI then mark FAILED when Stripe shows requires_confirmation", async () => {
		const order = {
			id: "order-rc",
			orderNumber: "SYN-RC",
			stripePaymentIntentId: "pi_requires_confirmation",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			id: "pi_requires_confirmation",
			status: "requires_confirmation",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_requires_confirmation");
		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(result!.updated).toBe(1);
	});

	// F1 race : le PI passe succeeded entre le retrieve et le cancel → on encaisse.
	it("F1: should process as PAID when cancel races a late succeeded PI", async () => {
		const order = {
			id: "order-race",
			orderNumber: "SYN-RACE",
			stripePaymentIntentId: "pi_race",
			paymentStatus: "PENDING",
			userId: "user-race",
		};
		const succeededPi = { id: "pi_race", status: "succeeded" };
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ id: "pi_race", status: "requires_action" })
			.mockResolvedValueOnce(succeededPi);
		mockStripe.paymentIntents.cancel.mockRejectedValue(
			new Error("PaymentIntent already succeeded"),
		);

		const result = await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).toHaveBeenCalledWith(
			"order-race",
			succeededPi,
			undefined,
		);
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
	});

	// F1 : si le cancel échoue ET le PI n'est pas succeeded, on garde PENDING.
	it("F1: should keep order PENDING (errors++) when cancel fails and PI not succeeded", async () => {
		const order = {
			id: "order-cancel-fail",
			orderNumber: "SYN-CF",
			stripePaymentIntentId: "pi_cf",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ id: "pi_cf", status: "requires_action" })
			.mockResolvedValueOnce({ id: "pi_cf", status: "requires_action" });
		mockStripe.paymentIntents.cancel.mockRejectedValue(new Error("Stripe down"));

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.errors).toBe(1);
	});

	it("should not update orders still in processing state", async () => {
		const order = {
			id: "order-4",
			orderNumber: "SYN-004",
			stripePaymentIntentId: "pi_processing",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(mockProcessOrderFromPaymentIntent).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should count errors when Stripe API call fails", async () => {
		const order = {
			id: "order-5",
			orderNumber: "SYN-005",
			stripePaymentIntentId: "pi_error",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error("Stripe API error"));

		const result = await syncAsyncPayments();

		expect(result!.errors).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should skip orders with null stripePaymentIntentId", async () => {
		const order = {
			id: "order-6",
			orderNumber: "SYN-006",
			stripePaymentIntentId: null,
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
		expect(result!.checked).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should handle mixed results across multiple orders", async () => {
		const orders = [
			{
				id: "order-ok",
				orderNumber: "SYN-OK",
				stripePaymentIntentId: "pi_ok",
				paymentStatus: "PENDING",
			},
			{
				id: "order-err",
				orderNumber: "SYN-ERR",
				stripePaymentIntentId: "pi_err",
				paymentStatus: "PENDING",
			},
			{
				id: "order-pending",
				orderNumber: "SYN-PEND",
				stripePaymentIntentId: "pi_pend",
				paymentStatus: "PENDING",
			},
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ status: "succeeded" })
			.mockRejectedValueOnce(new Error("API error"))
			.mockResolvedValueOnce({ status: "processing" });

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(3);
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should return hasMore: true when exactly 25 orders are returned", async () => {
		const orders = Array.from({ length: 25 }, (_, i) => ({
			id: `order-${i}`,
			orderNumber: `SYN-${String(i).padStart(3, "0")}`,
			stripePaymentIntentId: `pi_${i}`,
			paymentStatus: "PENDING",
		}));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(25);
		expect(result!.hasMore).toBe(true);
	});

	it("OPS-AUDIT-003: should leave order PENDING (errors++) when restoreStockForOrder fails", async () => {
		const order = {
			id: "order-stock-fail",
			orderNumber: "SYN-STOCK-FAIL",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);
		mockRestoreStockForOrder.mockRejectedValue(new Error("Stock restore failed"));

		const result = await syncAsyncPayments();

		// OPS-AUDIT-003 : stock-first → skip markOrderAsFailed so order stays
		// PENDING for the next 4h run (atomic retry).
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-stock-fail");
		expect(result!.updated).toBe(0);
		expect(result!.errors).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should emit exactly one aggregated admin alert when multiple stock restores fail", async () => {
		const orders = Array.from({ length: 3 }, (_, i) => ({
			id: `order-stock-fail-${i}`,
			orderNumber: `SYN-SF-${i}`,
			stripePaymentIntentId: `pi_canceled_${i}`,
			paymentStatus: "PENDING",
		}));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
		mockExtractPaymentFailureDetails.mockReturnValue({ reason: "canceled" });
		mockRestoreStockForOrder.mockRejectedValue(new Error("Stock DB locked"));

		await syncAsyncPayments();

		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledTimes(1);
		const alertPayload = mockSendAdminCronFailedAlert.mock.calls[0]![0];
		expect(alertPayload.job).toBe("sync-async-payments");
		expect(alertPayload.errors).toBe(3);
		expect(alertPayload.details.issue).toBe("stock-restore-failed");
		expect(alertPayload.details.failures).toHaveLength(3);
		expect(alertPayload.details.failures[0]).toMatchObject({
			orderId: "order-stock-fail-0",
			orderNumber: "SYN-SF-0",
			error: "Stock DB locked",
		});
	});

	it("should not emit any admin alert when no stock restores fail", async () => {
		const order = {
			id: "order-ok",
			orderNumber: "SYN-OK",
			stripePaymentIntentId: "pi_ok",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: "succeeded" });

		await syncAsyncPayments();

		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});
});
