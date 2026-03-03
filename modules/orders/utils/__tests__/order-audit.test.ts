import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	HistorySource: {
		ADMIN: "ADMIN",
		WEBHOOK: "WEBHOOK",
		CRON: "CRON",
		CUSTOMER: "CUSTOMER",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { orderHistory: { create: vi.fn() } },
}));

import { buildStatusChangeAudit } from "../order-audit";

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
});
