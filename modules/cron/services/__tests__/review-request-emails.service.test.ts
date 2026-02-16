import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockSendReviewRequestEmailInternal,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockSendReviewRequestEmailInternal: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/reviews/actions/send-review-request-email", () => ({
	sendReviewRequestEmailInternal: mockSendReviewRequestEmailInternal,
}));

import { sendDelayedReviewRequestEmails } from "../review-request-emails.service";
import { ActionStatus } from "@/shared/types/server-action";

describe("sendDelayedReviewRequestEmails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-09T10:00:00Z"));
	});

	it("should return zero counts when no orders need review requests", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual({ found: 0, sent: 0, errors: 0, hasMore: false });
	});

	it("should query delivered orders with correct filters", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await sendDelayedReviewRequestEmails();

		const call = mockPrisma.order.findMany.mock.calls[0][0];
		expect(call.where.deletedAt).toBeNull();
		expect(call.where.fulfillmentStatus).toBe("DELIVERED");
		expect(call.where.reviewRequestSentAt).toBeNull();
		expect(call.where.actualDelivery.lt).toBeInstanceOf(Date);
		expect(call.where.actualDelivery.gt).toBeInstanceOf(Date);
		expect(call.take).toBe(25);
	});

	it("should use correct time window (2-14 days after delivery)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await sendDelayedReviewRequestEmails();

		const call = mockPrisma.order.findMany.mock.calls[0][0];
		const now = Date.now();

		// lt threshold = 2 days ago
		const twoDAysAgo = now - 2 * 24 * 60 * 60 * 1000;
		expect(call.where.actualDelivery.lt.getTime()).toBe(twoDAysAgo);

		// gt threshold = 14 days ago
		const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
		expect(call.where.actualDelivery.gt.getTime()).toBe(fourteenDaysAgo);
	});

	it("should send email for each eligible order and count successes", async () => {
		const orders = [
			{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" },
			{ id: "order-2", orderNumber: "SYN-002", customerEmail: "b@test.com" },
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "OK",
		});

		const result = await sendDelayedReviewRequestEmails();

		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledTimes(2);
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith("order-1");
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith("order-2");
		expect(result).toEqual({ found: 2, sent: 2, errors: 0, hasMore: false });
	});

	it("should count errors when sendReviewRequestEmailInternal returns non-success", async () => {
		const orders = [
			{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" },
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Email failed",
		});

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual({ found: 1, sent: 0, errors: 1, hasMore: false });
	});

	it("should count errors when sendReviewRequestEmailInternal throws", async () => {
		const orders = [
			{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" },
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockSendReviewRequestEmailInternal.mockRejectedValue(
			new Error("Network error")
		);

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual({ found: 1, sent: 0, errors: 1, hasMore: false });
	});

	it("should handle mixed results and continue on error", async () => {
		const orders = [
			{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" },
			{ id: "order-2", orderNumber: "SYN-002", customerEmail: "b@test.com" },
			{ id: "order-3", orderNumber: "SYN-003", customerEmail: "c@test.com" },
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockSendReviewRequestEmailInternal
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" })
			.mockRejectedValueOnce(new Error("Timeout"))
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" });

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual({ found: 3, sent: 2, errors: 1, hasMore: false });
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledTimes(3);
	});
});
