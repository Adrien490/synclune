import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockIsAdmin } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			groupBy: vi.fn(),
			aggregate: vi.fn(),
		},
		eReportingBatch: {
			groupBy: vi.fn(),
			findMany: vi.fn(),
		},
		eReportingTransaction: {
			count: vi.fn(),
		},
	},
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	EReportingStatus: {
		PENDING: "PENDING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		RETRYING: "RETRYING",
		ABANDONED: "ABANDONED",
	},
	InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
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
	mockPrisma.eReportingBatch.groupBy.mockResolvedValue([]);
	mockPrisma.eReportingBatch.findMany.mockResolvedValue([]);
	mockPrisma.eReportingTransaction.count.mockResolvedValue(0);
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

	it("zero-fills every batch status key", async () => {
		mockPrisma.eReportingBatch.groupBy.mockResolvedValue([
			{ status: "PENDING", _count: { status: 3 } },
			{ status: "REJECTED", _count: { status: 1 } },
		]);

		const result = await getInvoicingOverview();
		expect(result?.batchCounters).toEqual({
			PENDING: 3,
			SENT: 0,
			ACCEPTED: 0,
			REJECTED: 1,
			RETRYING: 0,
			ABANDONED: 0,
		});
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

	it("counts SALES and REFUND transactions separately", async () => {
		mockPrisma.eReportingTransaction.count
			.mockResolvedValueOnce(15) // SALES
			.mockResolvedValueOnce(2); // REFUND

		const result = await getInvoicingOverview();
		expect(result?.last30DaysTransactionCount).toBe(15);
		expect(result?.last30DaysRefundCount).toBe(2);
	});
});

describe("getInvoicingOverview — batches lists", () => {
	it("returns last 10 REJECTED batches ordered by rejectedAt desc", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValueOnce([
			{
				id: "b-rej-1",
				status: "REJECTED",
				periodFrom: new Date("2026-05-25"),
				periodTo: new Date("2026-05-26"),
				transactionCount: 3,
				totalAmountIncTax: 5000,
				currency: "EUR",
				rejectionReason: "Schéma XML invalide",
				createdAt: new Date(),
			},
		]);

		const result = await getInvoicingOverview();
		expect(mockPrisma.eReportingBatch.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { status: "REJECTED" },
				orderBy: { rejectedAt: "desc" },
				take: 10,
			}),
		);
		expect(result?.rejectedBatches).toHaveLength(1);
	});

	it("returns PENDING + RETRYING batches together (file transmission)", async () => {
		await getInvoicingOverview();
		// 2nd findMany call = pending list
		expect(mockPrisma.eReportingBatch.findMany).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				where: { status: { in: ["PENDING", "RETRYING"] } },
				take: 10,
			}),
		);
	});
});
