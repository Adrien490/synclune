/**
 * @regression ORD-BIZ-011
 *
 * Garantit que `processOrderTransaction` / `processOrderFromPaymentIntent`
 * détectent un webhook `payment_intent.succeeded` arrivant APRÈS qu'un cancel
 * admin a déjà marqué la commande CANCELLED, et lancent un auto-refund Stripe
 * + throw `CancelledOrderRaceError` pour court-circuiter la chain post-paiement.
 *
 * Sans cette régression : la commande reste CANCELLED + paymentStatus=FAILED
 * (posé par cancelOrder), mais la charge Stripe reste capturée → fonds non
 * remboursés. L'idempotence webhook bypass tout traitement (paymentStatus !== PAID).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { mockPrisma, mockInitiateAutomaticRefund } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockInitiateAutomaticRefund: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/prisma-tx-options", () => ({
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 10000,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentMethod: { CARD: "CARD" },
}));

vi.mock("@/modules/orders/constants/stripe-shipping-rates", () => ({
	getShippingMethodFromRate: vi.fn().mockReturnValue("STANDARD"),
	getShippingCarrierFromRate: vi.fn().mockReturnValue("colissimo"),
}));

vi.mock("../payment-intent.service", () => ({
	initiateAutomaticRefund: mockInitiateAutomaticRefund,
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn((cb: (scope: unknown) => void) =>
		cb({ setLevel: vi.fn(), setTag: vi.fn(), setContext: vi.fn() }),
	),
	captureMessage: vi.fn(),
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

import {
	processOrderTransaction,
	processOrderFromPaymentIntent,
	CancelledOrderRaceError,
} from "../checkout-order-processing.service";

describe("ORD-BIZ-011 — webhook payment_intent.succeeded race avec cancel-order", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInitiateAutomaticRefund.mockResolvedValue({ success: true, refundId: "re_auto_1" });
	});

	describe("processOrderTransaction (CS flow)", () => {
		it("throw CancelledOrderRaceError + auto-refund quand commande CANCELLED", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-1",
				orderNumber: "SYN-2026-0001",
				status: "CANCELLED",
			});

			const session = {
				id: "cs_1",
				payment_intent: "pi_late_1",
				amount_total: 5000,
				metadata: {},
			} as unknown as Stripe.Checkout.Session;

			await expect(processOrderTransaction("order-1", session, 0, undefined)).rejects.toThrow(
				CancelledOrderRaceError,
			);

			expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
				"pi_late_1",
				"order-1",
				"cancelled-before-confirmation",
			);
			// Pas de transaction ouverte si CANCELLED détecté
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("ne triggers PAS l'auto-refund si commande PENDING (flow normal)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-1",
				orderNumber: "SYN-2026-0001",
				status: "PENDING",
			});
			// Mock transaction returns minimal order
			mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
				const tx = {
					order: {
						findUnique: vi.fn().mockResolvedValue({
							id: "order-1",
							orderNumber: "SYN-2026-0001",
							userId: null,
							customerEmail: null,
							shippingFirstName: null,
							shippingLastName: null,
							shippingAddress1: null,
							shippingAddress2: null,
							shippingPostalCode: null,
							shippingCity: null,
							shippingCountry: null,
							shippingPhone: null,
							subtotal: 5000,
							discountAmount: 0,
							shippingCost: 0,
							taxAmount: 0,
							total: 5000,
							paymentStatus: "PAID",
							status: "PROCESSING",
							items: [],
						}),
						update: vi.fn(),
					},
					$queryRaw: vi.fn().mockResolvedValue([]),
					productSku: { update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
					cartItem: { deleteMany: vi.fn() },
					orderHistory: { create: vi.fn() },
				};
				return cb(tx as unknown as typeof mockPrisma);
			});

			const session = {
				id: "cs_1",
				payment_intent: "pi_normal_1",
				amount_total: 5000,
				metadata: {},
				customer: null,
			} as unknown as Stripe.Checkout.Session;

			await processOrderTransaction("order-1", session, 0, undefined);

			expect(mockInitiateAutomaticRefund).not.toHaveBeenCalled();
		});
	});

	describe("processOrderFromPaymentIntent (PI flow)", () => {
		it("throw CancelledOrderRaceError + auto-refund quand commande CANCELLED", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-2",
				orderNumber: "SYN-2026-0002",
				status: "CANCELLED",
			});

			const paymentIntent = {
				id: "pi_late_2",
				amount_received: 7500,
				metadata: {},
				customer: null,
			} as unknown as Stripe.PaymentIntent;

			await expect(processOrderFromPaymentIntent("order-2", paymentIntent)).rejects.toThrow(
				CancelledOrderRaceError,
			);

			expect(mockInitiateAutomaticRefund).toHaveBeenCalledWith(
				"pi_late_2",
				"order-2",
				"cancelled-before-confirmation",
			);
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("CancelledOrderRaceError contient orderId pour le caller", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-3",
				orderNumber: "SYN-2026-0003",
				status: "CANCELLED",
			});

			const paymentIntent = {
				id: "pi_late_3",
				metadata: {},
				customer: null,
			} as unknown as Stripe.PaymentIntent;

			try {
				await processOrderFromPaymentIntent("order-3", paymentIntent);
				expect.fail("should have thrown");
			} catch (e) {
				expect(e).toBeInstanceOf(CancelledOrderRaceError);
				expect((e as CancelledOrderRaceError).orderId).toBe("order-3");
			}
		});
	});
});
