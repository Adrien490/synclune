import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsletterStatus } from "@/app/generated/prisma/client";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import {
	cleanupUnconfirmedNewsletterSubscriptions,
	unsubscribeInactiveNewsletterSubscribers,
} from "../cleanup-newsletter.service";
import { RETENTION, BATCH_SIZE_LARGE } from "@/modules/cron/constants/limits";

describe("cleanupUnconfirmedNewsletterSubscriptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({ count: 0 });
	});

	it("should delete unconfirmed subscriptions older than 7 days", async () => {
		const ids = [{ id: "1" }, { id: "2" }, { id: "3" }];
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({ count: 3 });

		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result.deleted).toBe(3);
		expect(result.hasMore).toBe(false);
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.newsletterSubscriber.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["1", "2", "3"] } },
		});
	});

	it("should verify correct query filters (PENDING status, confirmationSentAt < expiry, confirmedAt null)", async () => {
		await cleanupUnconfirmedNewsletterSubscriptions();

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where.status).toBe(NewsletterStatus.PENDING);
		expect(call.where.confirmationSentAt).toHaveProperty("lt");
		expect(call.where.confirmedAt).toBe(null);
		expect(call.select).toEqual({ id: true });
		expect(call.take).toBe(1000);
	});

	it("should verify the expiry date is 7 days ago", async () => {
		await cleanupUnconfirmedNewsletterSubscriptions();

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		const expiryDate = call.where.confirmationSentAt.lt;

		// Current time: 2026-02-16T10:00:00Z
		// 7 days ago: 2026-02-09T10:00:00Z
		const expectedExpiry = new Date(
			Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000,
		);

		expect(expiryDate.getTime()).toBe(expectedExpiry.getTime());
		expect(expiryDate.toISOString()).toBe("2026-02-09T10:00:00.000Z");
	});

	it("should handle zero deletions", async () => {
		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result.deleted).toBe(0);
		expect(result.hasMore).toBe(false);
	});

	it("should return hasMore true when delete limit is reached", async () => {
		const ids = Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({ count: 1000 });

		const result = await cleanupUnconfirmedNewsletterSubscriptions();

		expect(result.deleted).toBe(1000);
		expect(result.hasMore).toBe(true);
	});

	it("should log warning when delete limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const ids = Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.deleteMany.mockResolvedValue({ count: 1000 });

		await cleanupUnconfirmedNewsletterSubscriptions();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Delete limit reached, remaining will be cleaned on next run"),
		);
	});

	it("should propagate errors from prisma operations", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB connection lost"));

		await expect(cleanupUnconfirmedNewsletterSubscriptions()).rejects.toThrow("DB connection lost");
	});
});

// ============================================================================
// unsubscribeInactiveNewsletterSubscribers
// ============================================================================

describe("unsubscribeInactiveNewsletterSubscribers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 0 });
	});

	// -------------------------------------------------------------------------
	// Correct query filters
	// -------------------------------------------------------------------------

	it("should query CONFIRMED subscribers with confirmedAt older than 3 years", async () => {
		await unsubscribeInactiveNewsletterSubscribers();

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where.status).toBe(NewsletterStatus.CONFIRMED);
		expect(call.where.confirmedAt).toHaveProperty("lt");
		expect(call.select).toEqual({ id: true });
		expect(call.take).toBe(BATCH_SIZE_LARGE);
	});

	it("should calculate the inactivity date as 3 years ago", async () => {
		await unsubscribeInactiveNewsletterSubscribers();

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		const inactivityDate = call.where.confirmedAt.lt;

		const expectedDate = new Date(
			Date.now() - RETENTION.NEWSLETTER_INACTIVITY_YEARS * 365 * 24 * 60 * 60 * 1000,
		);

		expect(inactivityDate.getTime()).toBe(expectedDate.getTime());
		// 2026-02-16 minus 3 years ≈ 2023-02-17 (3 * 365 days)
		expect(inactivityDate.getFullYear()).toBe(2023);
	});

	// -------------------------------------------------------------------------
	// Successful unsubscription
	// -------------------------------------------------------------------------

	it("should update matching subscribers to UNSUBSCRIBED status", async () => {
		const ids = [{ id: "sub-1" }, { id: "sub-2" }, { id: "sub-3" }];
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 3 });

		const result = await unsubscribeInactiveNewsletterSubscribers();

		expect(result.unsubscribed).toBe(3);
		expect(result.hasMore).toBe(false);
		expect(mockPrisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["sub-1", "sub-2", "sub-3"] } },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: expect.any(Date),
			},
		});
	});

	// -------------------------------------------------------------------------
	// Zero results
	// -------------------------------------------------------------------------

	it("should return zero unsubscribed when no inactive subscribers found", async () => {
		const result = await unsubscribeInactiveNewsletterSubscribers();

		expect(result.unsubscribed).toBe(0);
		expect(result.hasMore).toBe(false);
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Batch limit (hasMore)
	// -------------------------------------------------------------------------

	it("should return hasMore true when batch limit is reached", async () => {
		const ids = Array.from({ length: BATCH_SIZE_LARGE }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: BATCH_SIZE_LARGE });

		const result = await unsubscribeInactiveNewsletterSubscribers();

		expect(result.unsubscribed).toBe(BATCH_SIZE_LARGE);
		expect(result.hasMore).toBe(true);
	});

	it("should log warning when batch limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const ids = Array.from({ length: BATCH_SIZE_LARGE }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: BATCH_SIZE_LARGE });

		await unsubscribeInactiveNewsletterSubscribers();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Batch limit reached for inactive subscribers"),
		);
	});

	it("should return hasMore false when fewer items than batch limit", async () => {
		const ids = [{ id: "sub-1" }];
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(ids);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });

		const result = await unsubscribeInactiveNewsletterSubscribers();

		expect(result.hasMore).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Idempotence
	// -------------------------------------------------------------------------

	it("should be idempotent - running twice yields zero on second run when no new inactive subscribers", async () => {
		// First run: unsubscribe some
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValueOnce([{ id: "sub-1" }]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValueOnce({ count: 1 });

		const first = await unsubscribeInactiveNewsletterSubscribers();
		expect(first.unsubscribed).toBe(1);

		// Second run: no more inactive subscribers
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValueOnce([]);

		const second = await unsubscribeInactiveNewsletterSubscribers();
		expect(second.unsubscribed).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------------

	it("should propagate errors from prisma operations", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB timeout"));

		await expect(unsubscribeInactiveNewsletterSubscribers()).rejects.toThrow("DB timeout");
	});

	it("should propagate errors from updateMany", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([{ id: "sub-1" }]);
		mockPrisma.newsletterSubscriber.updateMany.mockRejectedValue(new Error("Update failed"));

		await expect(unsubscribeInactiveNewsletterSubscribers()).rejects.toThrow("Update failed");
	});
});
