import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockIsAdmin } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			groupBy: vi.fn(),
			aggregate: vi.fn(),
			count: vi.fn(),
			findMany: vi.fn(),
		},
	},
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
	// Requis transitivement par PAID_REVENUE_STATUSES (COMP-03 : fenêtre franchise
	// alignée sur get-vat-progress = CA encaissé brut incluant les remboursées).
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
}));

vi.mock("@/modules/auth/utils/guards", () => ({ isAdmin: mockIsAdmin }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_ORDERS_LIST: "admin-orders-list" },
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { getInvoicingOverview } from "../get-invoicing-overview";

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));
	mockIsAdmin.mockResolvedValue(true);

	// Defaults : empty everywhere
	mockPrisma.order.groupBy.mockResolvedValue([]);
	mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });
	mockPrisma.order.count.mockResolvedValue(0);
	mockPrisma.order.findMany.mockResolvedValue([]);
});

afterEach(() => vi.useRealTimers());

describe("getInvoicingOverview — auth guard", () => {
	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const result = await getInvoicingOverview();
		expect(result).toBeNull();
		expect(mockPrisma.order.groupBy).not.toHaveBeenCalled();
	});
});

describe("getInvoicingOverview — counters mapping", () => {
	it("zero-fills every invoiceStatus key even when DB returns subset", async () => {
		mockPrisma.order.groupBy.mockResolvedValue([
			{ invoiceStatus: "GENERATED", _count: { invoiceStatus: 42 } },
		]);

		const result = await getInvoicingOverview();
		expect(result?.invoiceCounters).toEqual({ PENDING: 0, GENERATED: 42, VOIDED: 0 });
	});

	it("ignores null invoiceStatus rows (orders without invoice yet)", async () => {
		mockPrisma.order.groupBy.mockResolvedValue([
			{ invoiceStatus: null, _count: { invoiceStatus: 5 } },
			{ invoiceStatus: "GENERATED", _count: { invoiceStatus: 10 } },
		]);

		const result = await getInvoicingOverview();
		expect(result?.invoiceCounters.PENDING).toBe(0);
		expect(result?.invoiceCounters.GENERATED).toBe(10);
	});
});

describe("getInvoicingOverview — 30-day window", () => {
	it("filters revenue aggregate on paidAt last 30 days (Art. 50-0 CGI)", async () => {
		await getInvoicingOverview();
		expect(mockPrisma.order.aggregate).toHaveBeenCalledWith({
			where: expect.objectContaining({
				paymentStatus: "PAID",
				paidAt: {
					gte: new Date("2026-04-28T12:00:00Z"),
					lte: new Date("2026-05-28T12:00:00Z"),
				},
				deletedAt: null,
			}),
			_sum: { total: true },
		});
	});

	it("returns 0 cents revenue when DB has no PAID orders in window", async () => {
		const result = await getInvoicingOverview();
		expect(result?.last30DaysRevenueCents).toBe(0);
	});
});
