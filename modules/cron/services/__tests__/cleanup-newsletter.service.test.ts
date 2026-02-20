import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsletterStatus } from "@/app/generated/prisma/client";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findMany: vi.fn(),
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

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0][0];
		expect(call.where.status).toBe(NewsletterStatus.PENDING);
		expect(call.where.confirmationSentAt).toHaveProperty("lt");
		expect(call.where.confirmedAt).toBe(null);
		expect(call.select).toEqual({ id: true });
		expect(call.take).toBe(1000);
	});

	it("should verify the expiry date is 7 days ago", async () => {
		await cleanupUnconfirmedNewsletterSubscriptions();

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0][0];
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
			"[CRON:cleanup-newsletter] Delete limit reached, remaining will be cleaned on next run"
		);
	});
});
