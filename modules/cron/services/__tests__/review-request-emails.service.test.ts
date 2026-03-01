import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendReviewRequestEmailInternal, mockSendReviewReminderEmail } = vi.hoisted(
	() => ({
		mockPrisma: {
			order: { findMany: vi.fn(), update: vi.fn() },
		},
		mockSendReviewRequestEmailInternal: vi.fn(),
		mockSendReviewReminderEmail: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/reviews/services/send-review-request-email.service", () => ({
	sendReviewRequestEmailInternal: mockSendReviewRequestEmailInternal,
}));

vi.mock("@/modules/emails/services/review-emails", () => ({
	sendReviewReminderEmail: mockSendReviewReminderEmail,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn().mockReturnValue("https://example.com/unsubscribe"),
	ROUTES: { NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/unsubscribe" } },
}));

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://example.com",
}));

import { sendDelayedReviewRequestEmails } from "../review-request-emails.service";
import { ActionStatus } from "@/shared/types/server-action";

// The service now returns { found, sent, errors, hasMore, remindersFound, remindersSent, reminderErrors }
// Use objectContaining to only assert on the fields relevant to each test.

describe("sendDelayedReviewRequestEmails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T10:00:00Z"));

		// Default: both findMany calls return empty arrays (no orders to process)
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockSendReviewReminderEmail.mockResolvedValue({ success: true });
	});

	it("should return zero counts when no orders need review requests", async () => {
		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual({
			found: 0,
			sent: 0,
			errors: 0,
			hasMore: false,
			remindersFound: 0,
			remindersSent: 0,
			reminderErrors: 0,
		});
	});

	it("should query delivered orders with correct filters", async () => {
		await sendDelayedReviewRequestEmails();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.deletedAt).toBeNull();
		expect(call.where.fulfillmentStatus).toBe("DELIVERED");
		expect(call.where.reviewRequestSentAt).toBeNull();
		expect(call.where.actualDelivery.lt).toBeInstanceOf(Date);
		expect(call.where.actualDelivery.gt).toBeInstanceOf(Date);
		expect(call.take).toBe(25);
	});

	it("should use correct time window (2-14 days after delivery)", async () => {
		await sendDelayedReviewRequestEmails();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
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
		// First call: initial review request orders; second call: reminder orders (empty)
		mockPrisma.order.findMany.mockResolvedValueOnce(orders).mockResolvedValueOnce([]);
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "OK",
		});

		const result = await sendDelayedReviewRequestEmails();

		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledTimes(2);
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith("order-1");
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith("order-2");
		expect(result).toEqual(
			expect.objectContaining({ found: 2, sent: 2, errors: 0, hasMore: false }),
		);
	});

	it("should count errors when sendReviewRequestEmailInternal returns non-success", async () => {
		const orders = [{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" }];
		mockPrisma.order.findMany.mockResolvedValueOnce(orders).mockResolvedValueOnce([]);
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Email failed",
		});

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual(
			expect.objectContaining({ found: 1, sent: 0, errors: 1, hasMore: false }),
		);
	});

	it("should count errors when sendReviewRequestEmailInternal throws", async () => {
		const orders = [{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" }];
		mockPrisma.order.findMany.mockResolvedValueOnce(orders).mockResolvedValueOnce([]);
		mockSendReviewRequestEmailInternal.mockRejectedValue(new Error("Network error"));

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual(
			expect.objectContaining({ found: 1, sent: 0, errors: 1, hasMore: false }),
		);
	});

	it("should handle mixed results and continue on error", async () => {
		const orders = [
			{ id: "order-1", orderNumber: "SYN-001", customerEmail: "a@test.com" },
			{ id: "order-2", orderNumber: "SYN-002", customerEmail: "b@test.com" },
			{ id: "order-3", orderNumber: "SYN-003", customerEmail: "c@test.com" },
		];
		mockPrisma.order.findMany.mockResolvedValueOnce(orders).mockResolvedValueOnce([]);
		mockSendReviewRequestEmailInternal
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" })
			.mockRejectedValueOnce(new Error("Timeout"))
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" });

		const result = await sendDelayedReviewRequestEmails();

		expect(result).toEqual(
			expect.objectContaining({ found: 3, sent: 2, errors: 1, hasMore: false }),
		);
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledTimes(3);
	});
});
