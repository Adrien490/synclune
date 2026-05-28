/**
 * @regression ORD-BIZ-001
 *
 * Garantit que `syncStripeRefunds` crée des `RefundItem` au pro-rata pour les
 * partial refunds Dashboard Stripe (pas seulement les full refunds).
 *
 * Sans cette régression : un partial refund initié depuis le Dashboard Stripe
 * arrive via `charge.refunded`, crée un `Refund` orphelin sans `RefundItems`,
 * perd la traçabilité comptable Art. 272-I CGI et empêche tout restock.
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

vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({
	SYSTEM_AUTHOR_ID: "00000000-0000-0000-0000-000000000000",
}));

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

	it("crée RefundItem pour CHAQUE OrderItem éligible sur un partial refund (50% du total)", async () => {
		// order: 2 items × 1000 + 1 item × 500 = 2500 total
		// partial refund 1000 (40% du subtotal)
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 2500,
			items: [
				{ id: "oi-1", price: 1000, quantity: 1 },
				{ id: "oi-2", price: 1000, quantity: 1 },
				{ id: "oi-3", price: 500, quantity: 1 },
			],
		});

		await syncStripeRefunds(makePartialDashboardCharge(1000), [], "order-1");

		expect(mockTx.refund.create).toHaveBeenCalledTimes(1);
		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		expect(createCall?.data?.items?.create).toBeDefined();
		const allocated = createCall.data.items.create as Array<{
			orderItemId: string;
			quantity: number;
			amount: number;
			restock: boolean;
		}>;

		// 3 items doivent être alloués (pas un seul ignoré, aucun à zéro)
		expect(allocated).toHaveLength(3);
		// Somme allocations = montant remboursé exact (rounding compensé)
		const totalAllocated = allocated.reduce((acc, a) => acc + a.amount, 0);
		expect(totalAllocated).toBe(1000);
		// restock=false par défaut (admin doit décider)
		expect(allocated.every((a) => a.restock === false)).toBe(true);
		// quantity = qty originale (proxy "touché", contrainte DB quantity >= 1)
		expect(allocated.every((a) => a.quantity >= 1)).toBe(true);
	});

	it("crée RefundItem pour 100% des items sur un full refund", async () => {
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 2500,
			items: [
				{ id: "oi-1", price: 1000, quantity: 1 },
				{ id: "oi-2", price: 1000, quantity: 1 },
				{ id: "oi-3", price: 500, quantity: 1 },
			],
		});

		await syncStripeRefunds(makePartialDashboardCharge(2500), [], "order-1");

		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		const allocated = createCall.data.items.create as Array<{ amount: number; quantity: number }>;
		expect(allocated).toHaveLength(3);
		expect(allocated.find((a) => a.amount === 1000)).toBeDefined();
		expect(allocated.find((a) => a.amount === 500)).toBeDefined();
	});

	it("filtre les items dont l'amount pro-rata arrondi tomberait à 0 (contrainte DB amount > 0)", async () => {
		// Item très petit (1 cent) face à 2 items à 10000 cents : pro-rata sur 1% rounding peut tomber à 0
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 20001,
			items: [
				{ id: "oi-big-1", price: 10000, quantity: 1 },
				{ id: "oi-big-2", price: 10000, quantity: 1 },
				{ id: "oi-dust", price: 1, quantity: 1 },
			],
		});

		await syncStripeRefunds(makePartialDashboardCharge(100), [], "order-1");

		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		const allocated = createCall.data.items.create as Array<{
			orderItemId: string;
			amount: number;
		}>;
		// `oi-dust` à 1c sur 100c de refund → pro-rata = 0c, filtré
		expect(allocated.find((a) => a.orderItemId === "oi-dust")).toBeUndefined();
		// Sum doit toujours être exact (100)
		expect(allocated.reduce((acc, a) => acc + a.amount, 0)).toBe(100);
		// Contrainte DB : tous les amount > 0
		expect(allocated.every((a) => a.amount > 0)).toBe(true);
	});

	it("ne crée AUCUN RefundItem si la commande n'a aucun OrderItem (edge case)", async () => {
		mockTx.order.findUniqueOrThrow.mockResolvedValue({ total: 1000, items: [] });

		await syncStripeRefunds(makePartialDashboardCharge(500), [], "order-1");

		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		// Pas de bloc items.create injecté dans le payload
		expect(createCall.data.items).toBeUndefined();
	});

	it("marque le refund avec une note explicite mentionnant 'PARTIEL' + pro-rata", async () => {
		mockTx.order.findUniqueOrThrow.mockResolvedValue({
			total: 2000,
			items: [{ id: "oi-1", price: 2000, quantity: 1 }],
		});

		await syncStripeRefunds(makePartialDashboardCharge(500), [], "order-1");

		const createCall = mockTx.refund.create.mock.calls[0]?.[0];
		expect(createCall.data.note).toMatch(/PARTIEL/i);
		expect(createCall.data.note).toMatch(/pro-rata/i);
	});
});
