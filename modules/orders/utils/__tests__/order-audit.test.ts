import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrismaCreate, mockTxCreate } = vi.hoisted(() => ({
	mockPrismaCreate: vi.fn(),
	mockTxCreate: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	HistorySource: {
		ADMIN: "ADMIN",
		WEBHOOK: "WEBHOOK",
		CRON: "CRON",
		CUSTOMER: "CUSTOMER",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { orderHistory: { create: mockPrismaCreate } },
}));

import { buildStatusChangeAudit, createOrderAudit, createOrderAuditTx } from "../order-audit";

// ============================================================================
// createOrderAudit
// ============================================================================

describe("createOrderAudit", () => {
	beforeEach(() => {
		mockPrismaCreate.mockClear();
		mockPrismaCreate.mockResolvedValue(undefined);
	});

	it("calls prisma.orderHistory.create with the correct data", async () => {
		await createOrderAudit({
			orderId: "order-1",
			action: "STATUS_CHANGE" as never,
			previousStatus: "PENDING" as never,
			newStatus: "CONFIRMED" as never,
			previousPaymentStatus: "UNPAID" as never,
			newPaymentStatus: "PAID" as never,
			previousFulfillmentStatus: "UNFULFILLED" as never,
			newFulfillmentStatus: "SHIPPED" as never,
			note: "Admin action",
			metadata: { reason: "test" },
			authorId: "user-1",
			authorName: "Admin User",
			source: "ADMIN" as never,
		});

		expect(mockPrismaCreate).toHaveBeenCalledOnce();
		expect(mockPrismaCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-1",
				action: "STATUS_CHANGE",
				previousStatus: "PENDING",
				newStatus: "CONFIRMED",
				previousPaymentStatus: "UNPAID",
				newPaymentStatus: "PAID",
				previousFulfillmentStatus: "UNFULFILLED",
				newFulfillmentStatus: "SHIPPED",
				note: "Admin action",
				metadata: { reason: "test" },
				authorId: "user-1",
				authorName: "Admin User",
				source: "ADMIN",
			}),
		});
	});

	it("defaults source to ADMIN when not provided", async () => {
		await createOrderAudit({
			orderId: "order-2",
			action: "NOTE_ADDED" as never,
		});

		const callData = mockPrismaCreate.mock.calls[0]![0]!.data;
		expect(callData.source).toBe("ADMIN");
	});

	it("passes undefined optional fields through to prisma", async () => {
		await createOrderAudit({
			orderId: "order-3",
			action: "NOTE_ADDED" as never,
		});

		const callData = mockPrismaCreate.mock.calls[0]![0]!.data;
		expect(callData.previousStatus).toBeUndefined();
		expect(callData.newStatus).toBeUndefined();
		expect(callData.previousPaymentStatus).toBeUndefined();
		expect(callData.newPaymentStatus).toBeUndefined();
		expect(callData.previousFulfillmentStatus).toBeUndefined();
		expect(callData.newFulfillmentStatus).toBeUndefined();
		expect(callData.note).toBeUndefined();
		expect(callData.authorId).toBeUndefined();
		expect(callData.authorName).toBeUndefined();
	});

	it("uses provided source over default ADMIN", async () => {
		await createOrderAudit({
			orderId: "order-4",
			action: "PAYMENT_UPDATE" as never,
			source: "WEBHOOK" as never,
		});

		const callData = mockPrismaCreate.mock.calls[0]![0]!.data;
		expect(callData.source).toBe("WEBHOOK");
	});

	it("returns void (undefined)", async () => {
		const result = await createOrderAudit({
			orderId: "order-5",
			action: "NOTE_ADDED" as never,
		});

		expect(result).toBeUndefined();
	});
});

// ============================================================================
// createOrderAuditTx
// ============================================================================

describe("createOrderAuditTx", () => {
	let mockTx: { orderHistory: { create: ReturnType<typeof vi.fn> } };

	beforeEach(() => {
		mockPrismaCreate.mockClear();
		mockTxCreate.mockClear();
		mockTxCreate.mockResolvedValue(undefined);
		mockTx = { orderHistory: { create: mockTxCreate } };
	});

	it("calls tx.orderHistory.create with the correct data", async () => {
		await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-1",
			action: "STATUS_CHANGE" as never,
			previousStatus: "PENDING" as never,
			newStatus: "CONFIRMED" as never,
			note: "Transaction audit",
			source: "ADMIN" as never,
		});

		expect(mockTxCreate).toHaveBeenCalledOnce();
		expect(mockTxCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-tx-1",
				action: "STATUS_CHANGE",
				previousStatus: "PENDING",
				newStatus: "CONFIRMED",
				note: "Transaction audit",
				source: "ADMIN",
			}),
		});
	});

	it("defaults source to ADMIN when not provided", async () => {
		await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-2",
			action: "PAYMENT_UPDATE" as never,
		});

		const callData = mockTxCreate.mock.calls[0]![0]!.data;
		expect(callData.source).toBe("ADMIN");
	});

	it("does NOT call prisma directly — only uses the transaction client", async () => {
		await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-3",
			action: "NOTE_ADDED" as never,
		});

		expect(mockPrismaCreate).not.toHaveBeenCalled();
		expect(mockTxCreate).toHaveBeenCalledOnce();
	});

	it("uses provided source over default ADMIN", async () => {
		await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-4",
			action: "FULFILLMENT_UPDATE" as never,
			source: "CRON" as never,
		});

		const callData = mockTxCreate.mock.calls[0]![0]!.data;
		expect(callData.source).toBe("CRON");
	});

	it("passes all status fields through to the transaction client", async () => {
		await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-5",
			action: "STATUS_CHANGE" as never,
			previousStatus: "PENDING" as never,
			newStatus: "CANCELLED" as never,
			previousPaymentStatus: "UNPAID" as never,
			newPaymentStatus: "REFUNDED" as never,
			previousFulfillmentStatus: "UNFULFILLED" as never,
			newFulfillmentStatus: "RETURNED" as never,
			authorId: "admin-1",
			authorName: "Super Admin",
			metadata: { ip: "127.0.0.1" },
		});

		const callData = mockTxCreate.mock.calls[0]![0]!.data;
		expect(callData.previousStatus).toBe("PENDING");
		expect(callData.newStatus).toBe("CANCELLED");
		expect(callData.previousPaymentStatus).toBe("UNPAID");
		expect(callData.newPaymentStatus).toBe("REFUNDED");
		expect(callData.previousFulfillmentStatus).toBe("UNFULFILLED");
		expect(callData.newFulfillmentStatus).toBe("RETURNED");
		expect(callData.authorId).toBe("admin-1");
		expect(callData.authorName).toBe("Super Admin");
		expect(callData.metadata).toEqual({ ip: "127.0.0.1" });
	});

	it("returns void (undefined)", async () => {
		const result = await createOrderAuditTx(mockTx as never, {
			orderId: "order-tx-6",
			action: "NOTE_ADDED" as never,
		});

		expect(result).toBeUndefined();
	});
});

// ============================================================================
// buildStatusChangeAudit
// ============================================================================

describe("buildStatusChangeAudit", () => {
	const baseOrder = {
		status: "PENDING" as const,
		paymentStatus: "UNPAID" as const,
		fulfillmentStatus: "UNFULFILLED" as const,
	};

	it("detects status change and sets previous/new status", () => {
		const newOrder = { ...baseOrder, status: "CONFIRMED" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"STATUS_CHANGE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousStatus).toBe("PENDING");
		expect(result.newStatus).toBe("CONFIRMED");
	});

	it("sets status fields to undefined when status is unchanged", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
		);

		expect(result.previousStatus).toBeUndefined();
		expect(result.newStatus).toBeUndefined();
	});

	it("detects payment status change", () => {
		const newOrder = { ...baseOrder, paymentStatus: "PAID" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"PAYMENT_UPDATE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousPaymentStatus).toBe("UNPAID");
		expect(result.newPaymentStatus).toBe("PAID");
	});

	it("sets payment status fields to undefined when unchanged", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
		);

		expect(result.previousPaymentStatus).toBeUndefined();
		expect(result.newPaymentStatus).toBeUndefined();
	});

	it("detects fulfillment status change", () => {
		const newOrder = { ...baseOrder, fulfillmentStatus: "SHIPPED" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"FULFILLMENT_UPDATE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousFulfillmentStatus).toBe("UNFULFILLED");
		expect(result.newFulfillmentStatus).toBe("SHIPPED");
	});

	it("detects all three status changes simultaneously", () => {
		const newOrder = {
			status: "CONFIRMED" as const,
			paymentStatus: "PAID" as const,
			fulfillmentStatus: "SHIPPED" as const,
		};
		const result = buildStatusChangeAudit(
			"order-1",
			"STATUS_CHANGE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousStatus).toBe("PENDING");
		expect(result.newStatus).toBe("CONFIRMED");
		expect(result.previousPaymentStatus).toBe("UNPAID");
		expect(result.newPaymentStatus).toBe("PAID");
		expect(result.previousFulfillmentStatus).toBe("UNFULFILLED");
		expect(result.newFulfillmentStatus).toBe("SHIPPED");
	});

	it("defaults source to ADMIN when not specified", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
		);
		expect(result.source).toBe("ADMIN");
	});

	it("uses provided source when specified", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
			{
				source: "WEBHOOK" as never,
			},
		);
		expect(result.source).toBe("WEBHOOK");
	});

	it("passes through optional fields", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
			{
				note: "Test note",
				authorId: "user-1",
				authorName: "Admin",
				metadata: { reason: "test" },
			},
		);

		expect(result.note).toBe("Test note");
		expect(result.authorId).toBe("user-1");
		expect(result.authorName).toBe("Admin");
		expect(result.metadata).toEqual({ reason: "test" });
	});

	it("sets orderId and action correctly", () => {
		const result = buildStatusChangeAudit(
			"order-42",
			"CANCELLED" as never,
			baseOrder as never,
			baseOrder as never,
		);

		expect(result.orderId).toBe("order-42");
		expect(result.action).toBe("CANCELLED");
	});

	it("sets fulfillmentStatus fields to undefined when fulfillmentStatus is unchanged", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
		);

		expect(result.previousFulfillmentStatus).toBeUndefined();
		expect(result.newFulfillmentStatus).toBeUndefined();
	});

	it("omits optional options fields when options object is not provided", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
		);

		expect(result.note).toBeUndefined();
		expect(result.authorId).toBeUndefined();
		expect(result.authorName).toBeUndefined();
		expect(result.metadata).toBeUndefined();
	});

	it("only detects status change while payment and fulfillment remain the same", () => {
		const newOrder = { ...baseOrder, status: "CANCELLED" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"STATUS_CHANGE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousStatus).toBe("PENDING");
		expect(result.newStatus).toBe("CANCELLED");
		expect(result.previousPaymentStatus).toBeUndefined();
		expect(result.newPaymentStatus).toBeUndefined();
		expect(result.previousFulfillmentStatus).toBeUndefined();
		expect(result.newFulfillmentStatus).toBeUndefined();
	});

	it("only detects payment change while status and fulfillment remain the same", () => {
		const newOrder = { ...baseOrder, paymentStatus: "REFUNDED" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"PAYMENT_UPDATE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousStatus).toBeUndefined();
		expect(result.newStatus).toBeUndefined();
		expect(result.previousPaymentStatus).toBe("UNPAID");
		expect(result.newPaymentStatus).toBe("REFUNDED");
		expect(result.previousFulfillmentStatus).toBeUndefined();
		expect(result.newFulfillmentStatus).toBeUndefined();
	});

	it("only detects fulfillment change while status and payment remain the same", () => {
		const newOrder = { ...baseOrder, fulfillmentStatus: "DELIVERED" as const };
		const result = buildStatusChangeAudit(
			"order-1",
			"FULFILLMENT_UPDATE" as never,
			baseOrder as never,
			newOrder as never,
		);

		expect(result.previousStatus).toBeUndefined();
		expect(result.newStatus).toBeUndefined();
		expect(result.previousPaymentStatus).toBeUndefined();
		expect(result.newPaymentStatus).toBeUndefined();
		expect(result.previousFulfillmentStatus).toBe("UNFULFILLED");
		expect(result.newFulfillmentStatus).toBe("DELIVERED");
	});

	it("all statuses unchanged produces a params object with all status fields undefined", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"NOTE_ADDED" as never,
			baseOrder as never,
			baseOrder as never,
			{ note: "Just a note", source: "ADMIN" as never },
		);

		expect(result.previousStatus).toBeUndefined();
		expect(result.newStatus).toBeUndefined();
		expect(result.previousPaymentStatus).toBeUndefined();
		expect(result.newPaymentStatus).toBeUndefined();
		expect(result.previousFulfillmentStatus).toBeUndefined();
		expect(result.newFulfillmentStatus).toBeUndefined();
		expect(result.note).toBe("Just a note");
	});

	it("accepts CUSTOMER as source option", () => {
		const result = buildStatusChangeAudit(
			"order-1",
			"CANCELLATION_REQUESTED" as never,
			baseOrder as never,
			baseOrder as never,
			{ source: "CUSTOMER" as never },
		);
		expect(result.source).toBe("CUSTOMER");
	});
});
