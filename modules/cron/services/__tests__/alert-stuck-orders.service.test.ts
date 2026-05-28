import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockSendAdminStuckOrdersAlert,
	mockSendAdminInvoiceFailedAlert,
	mockSendAdminEReportingStuckAlert,
	mockSentryCapture,
	mockSentryWithScope,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
		eReportingBatch: { findMany: vi.fn() },
	},
	mockSendAdminStuckOrdersAlert: vi.fn(),
	mockSendAdminInvoiceFailedAlert: vi.fn(),
	mockSendAdminEReportingStuckAlert: vi.fn(),
	mockSentryCapture: vi.fn(),
	mockSentryWithScope: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminStuckOrdersAlert: mockSendAdminStuckOrdersAlert,
	sendAdminInvoiceFailedAlert: mockSendAdminInvoiceFailedAlert,
	sendAdminEReportingStuckAlert: mockSendAdminEReportingStuckAlert,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: () => "https://test.synclune.fr",
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: { PENDING: "PENDING", PROCESSING: "PROCESSING", SHIPPED: "SHIPPED" },
	PaymentStatus: { PAID: "PAID" },
	EReportingStatus: {
		PENDING: "PENDING",
		RETRYING: "RETRYING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		ABANDONED: "ABANDONED",
	},
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: mockSentryCapture,
	withScope: mockSentryWithScope,
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn(async (_opts: unknown, cb: () => unknown) => cb()),
}));

import { alertStuckOrders } from "../alert-stuck-orders.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

const NOW = new Date("2026-02-09T12:00:00Z");

interface FakeSentryScope {
	setTag: ReturnType<typeof vi.fn>;
	setLevel: ReturnType<typeof vi.fn>;
	setFingerprint: ReturnType<typeof vi.fn>;
	setContext: ReturnType<typeof vi.fn>;
}

describe("alertStuckOrders", () => {
	let lastScope: FakeSentryScope;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(NOW);
		mockSendAdminStuckOrdersAlert.mockResolvedValue({ success: true, data: { id: "email-1" } });
		mockSendAdminInvoiceFailedAlert.mockResolvedValue({ success: true, data: { id: "email-2" } });
		mockSendAdminEReportingStuckAlert.mockResolvedValue({ success: true, data: { id: "email-3" } });
		// Default : empty (invoice-stuck call #3). Tests qui ont besoin de
		// processing/shipped specifient via `mockResolvedValueOnce` ; le 3ᵉ
		// appel (invoice-stuck) tombera sur ce default.
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([]);
		mockSentryWithScope.mockImplementation((cb: (s: FakeSentryScope) => void) => {
			lastScope = {
				setTag: vi.fn(),
				setLevel: vi.fn(),
				setFingerprint: vi.fn(),
				setContext: vi.fn(),
			};
			cb(lastScope);
		});
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

	it("captures the email failure to Sentry with the 'email-failed' fingerprint (admin alert dead-loop)", async () => {
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
		const sendError = new Error("Resend down");
		mockSendAdminStuckOrdersAlert.mockRejectedValue(sendError);

		await alertStuckOrders();

		expect(mockSentryCapture).toHaveBeenCalledWith(sendError);
		expect(lastScope.setTag).toHaveBeenCalledWith("cronJob", "alert-stuck-orders");
		expect(lastScope.setFingerprint).toHaveBeenCalledWith([
			"cron",
			"alert-stuck-orders",
			"email-failed",
		]);
		expect(lastScope.setContext).toHaveBeenCalledWith(
			"stuckOrders",
			expect.objectContaining({ totalStuck: 1, processingCount: 1, shippedCount: 0 }),
		);
	});

	it("captures to Sentry even when sendAdminStuckOrdersAlert returns { success: false }", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				id: "s1",
				orderNumber: "SYN-200",
				total: 7800,
				shippedAt: new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000),
			},
		]);
		mockSendAdminStuckOrdersAlert.mockResolvedValue({
			success: false,
			error: new Error("Resend 500"),
		});

		await alertStuckOrders();

		expect(mockSentryCapture).toHaveBeenCalledOnce();
		expect(lastScope.setFingerprint).toHaveBeenCalledWith([
			"cron",
			"alert-stuck-orders",
			"email-failed",
		]);
	});
});
