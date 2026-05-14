import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendAdminStuckOrdersAlert } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockSendAdminStuckOrdersAlert: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminStuckOrdersAlert: mockSendAdminStuckOrdersAlert,
}));

import { alertStuckOrders } from "../alert-stuck-orders.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

const NOW = new Date("2026-02-09T12:00:00Z");

describe("alertStuckOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(NOW);
		mockSendAdminStuckOrdersAlert.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("returns zero counts and does NOT send email when no orders are stuck", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		const result = await alertStuckOrders();

		expect(result).toMatchObject({
			processed: 0,
			errored: 0,
			skipped: 0,
			processingStuck: 0,
			shippedStuck: 0,
		});
		expect(mockSendAdminStuckOrdersAlert).not.toHaveBeenCalled();
	});

	it("queries PROCESSING+PAID orders with paidAt older than 7 days", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await alertStuckOrders();

		const processingCall = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(processingCall.where.status).toBe("PROCESSING");
		expect(processingCall.where.paymentStatus).toBe("PAID");
		expect(processingCall.where.paidAt.not).toBeNull();
		expect(processingCall.where.deletedAt).toBeNull();

		const expectedCutoff = new Date(NOW.getTime() - THRESHOLDS.STUCK_PROCESSING_MS);
		expect(processingCall.where.paidAt.lt.getTime()).toBe(expectedCutoff.getTime());
	});

	it("queries SHIPPED orders with shippedAt older than 14 days AND actualDelivery null", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await alertStuckOrders();

		const shippedCall = mockPrisma.order.findMany.mock.calls[1]![0];
		expect(shippedCall.where.status).toBe("SHIPPED");
		expect(shippedCall.where.actualDelivery).toBeNull();
		expect(shippedCall.where.shippedAt.not).toBeNull();

		const expectedCutoff = new Date(NOW.getTime() - THRESHOLDS.STUCK_SHIPPED_MS);
		expect(shippedCall.where.shippedAt.lt.getTime()).toBe(expectedCutoff.getTime());
	});

	it("sends an aggregated alert with both processing and shipped buckets", async () => {
		const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
		const twentyDaysAgo = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000);

		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{ id: "p1", orderNumber: "SYN-100", total: 4500, paidAt: tenDaysAgo },
			])
			.mockResolvedValueOnce([
				{ id: "s1", orderNumber: "SYN-200", total: 7800, shippedAt: twentyDaysAgo },
				{ id: "s2", orderNumber: "SYN-201", total: 3200, shippedAt: twentyDaysAgo },
			]);

		const result = await alertStuckOrders();

		expect(mockSendAdminStuckOrdersAlert).toHaveBeenCalledTimes(1);
		const payload = mockSendAdminStuckOrdersAlert.mock.calls[0]![0];
		expect(payload.processingOrders).toEqual([
			expect.objectContaining({ orderNumber: "SYN-100", ageDays: 10, total: 4500 }),
		]);
		expect(payload.shippedOrders).toEqual([
			expect.objectContaining({ orderNumber: "SYN-200", ageDays: 20, total: 7800 }),
			expect.objectContaining({ orderNumber: "SYN-201", ageDays: 20, total: 3200 }),
		]);
		expect(result).toMatchObject({
			processed: 3,
			errored: 0,
			processingStuck: 1,
			shippedStuck: 2,
		});
	});

	it("reports errored=1 and processed=0 when the email send fails", async () => {
		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{
					id: "p1",
					orderNumber: "SYN-100",
					total: 4500,
					paidAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000),
				},
			])
			.mockResolvedValueOnce([]);
		mockSendAdminStuckOrdersAlert.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await alertStuckOrders();

		expect(result.errored).toBe(1);
		expect(result.processed).toBe(0);
	});

	it("reports errored=1 when sendAdminStuckOrdersAlert throws", async () => {
		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{
					id: "p1",
					orderNumber: "SYN-100",
					total: 4500,
					paidAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000),
				},
			])
			.mockResolvedValueOnce([]);
		mockSendAdminStuckOrdersAlert.mockRejectedValue(new Error("boom"));

		const result = await alertStuckOrders();

		expect(result.errored).toBe(1);
		expect(result.processed).toBe(0);
	});
});
