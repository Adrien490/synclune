import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsletterStatus } from "@/app/generated/prisma/client";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			deleteMany: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { cleanupUnconfirmedNewsletterSubscriptions } from "../cleanup-newsletter.service";
import { RETENTION } from "@/modules/cron/constants/limits";

describe("cleanupUnconfirmedNewsletterSubscriptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
	});

	it("should delete unconfirmed subscriptions older than 7 days", async () => {
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({
			count: 3,
		});

		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result.deleted).toBe(3);
		expect(mockPrisma.newsletterSubscriber.deleteMany).toHaveBeenCalledTimes(
			1
		);
	});

	it("should verify correct query filters (PENDING status, confirmationSentAt < expiry, confirmedAt null)", async () => {
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({
			count: 0,
		});

		await cleanupUnconfirmedNewsletterSubscriptions();

		const call = mockPrisma.newsletterSubscriber.deleteMany.mock.calls[0][0];
		expect(call.where.status).toBe(NewsletterStatus.PENDING);
		expect(call.where.confirmationSentAt).toHaveProperty("lt");
		expect(call.where.confirmedAt).toBe(null);
	});

	it("should verify the expiry date is 7 days ago", async () => {
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({
			count: 0,
		});

		await cleanupUnconfirmedNewsletterSubscriptions();

		const call = mockPrisma.newsletterSubscriber.deleteMany.mock.calls[0][0];
		const expiryDate = call.where.confirmationSentAt.lt;

		// Current time: 2026-02-16T10:00:00Z
		// 7 days ago: 2026-02-09T10:00:00Z
		const expectedExpiry = new Date(
			Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000
		);

		expect(expiryDate.getTime()).toBe(expectedExpiry.getTime());
		expect(expiryDate.toISOString()).toBe("2026-02-09T10:00:00.000Z");
	});

	it("should handle zero deletions", async () => {
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({
			count: 0,
		});

		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result.deleted).toBe(0);
		expect(mockPrisma.newsletterSubscriber.deleteMany).toHaveBeenCalledTimes(
			1
		);
	});

	it("should return correct count", async () => {
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({
			count: 15,
		});

		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result).toEqual({ deleted: 15 });
	});
});
