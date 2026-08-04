/**
 * @regression ORD-BIZ-001
 *
 * Garantit que `syncStripeRefunds` matérialise en base un remboursement initié
 * depuis le Dashboard Stripe (`charge.refunded`), full ou partiel : sans ça, le
 * remboursement n'existe que côté Stripe, l'avoir n'est jamais émis et la
 * traçabilité comptable Art. 272-I CGI est perdue.
 *
 * ⚠️ **Ce que cette régression NE garde plus, et pourquoi.** Elle verrouillait
 * l'allocation de `RefundItem` au pro-rata. Cette table est partie le 2026-08-05 :
 * l'itemisation était FABRIQUÉE — Stripe rembourse un MONTANT, jamais des
 * articles, donc rien ne disait quel article était concerné. Pire, l'allocation
 * gardait `quantity` = quantité commandée ENTIÈRE en ne proratisant que `amount`,
 * si bien que la ligne d'avoir imprimée affichait « 2 × 30,00 € » pour un total
 * de « 20,00 € » — une ligne qui ne s'additionne pas, figée sous SHA-256 dix ans.
 * L'avoir émet désormais UNE ligne au montant réellement remboursé (cf.
 * `build-credit-note-data.regression.test.ts`, qui verrouille l'arithmétique).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { mockPrisma, mockTx, mockCreateOrderAuditTx } = vi.hoisted(() => {
	const mockTx = {
		$queryRaw: vi.fn().mockResolvedValue([]),
		refund: {
			update: vi.fn(),
			updateMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			findMany: vi.fn(),
		},
		order: {
			findUniqueOrThrow: vi.fn(),
			update: vi.fn(),
		},
		orderHistory: { create: vi.fn() },
	};
	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
			refund: { findMany: vi.fn().mockResolvedValue([]) },
		},
		mockCreateOrderAuditTx: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID", PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED", REFUNDED: "REFUNDED" },
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
	HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
	},
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({}));

vi.mock("@/modules/refunds/services/refund-state-machine.service", () => ({
	canTransition: vi.fn().mockReturnValue(true),
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: vi.fn(),
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
	ROUTES: { ADMIN: { REFUNDS: "/admin/ventes/remboursements" } },
}));

import { syncStripeRefunds } from "../refund.service";

function makePartialDashboardCharge(amount: number): Stripe.Charge {
	return {
		id: "ch_dash_partial",
		refunds: {
			data: [
				{
					id: "re_dashboard_partial",
					status: "succeeded",
					amount,
					currency: "eur",
					metadata: {},
					reason: "requested_by_customer",
				},
			],
		},
	} as unknown as Stripe.Charge;
}

describe("ORD-BIZ-001 — Dashboard partial refund crée des RefundItem au pro-rata", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.refund.findUnique.mockResolvedValue(null);
		mockTx.refund.create.mockResolvedValue({ id: "ref-dashboard-partial" });
	});

	it("marque le refund avec une note explicite mentionnant 'PARTIEL' + pro-rata", async () => {
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 2000,
			items: [{ id: "oi-1", price: 2000, quantity: 1 }],
		});

		await syncStripeRefunds(makePartialDashboardCharge(500), [], "order-1");

		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		expect(createCall.data.note).toMatch(/PARTIEL/i);
		expect(createCall.data.note).toMatch(/intervention admin/i);
	});
});
