import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookEventStatus } from "@/app/generated/prisma/client";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		webhookEvent: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { cleanupOldWebhookEvents } from "../cleanup-webhook-events.service";
import { RETENTION } from "@/modules/cron/constants/limits";

describe("cleanupOldWebhookEvents", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		// Default: all findMany return empty, all deleteMany return 0
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);
		mockPrisma.webhookEvent.deleteMany.mockResolvedValue({ count: 0 });
	});

	it("should return zero counts when no webhook events are expired", async () => {
		const result = await cleanupOldWebhookEvents();

		expect(result).toEqual({
			completedDeleted: 0,
			failedDeleted: 0,
			skippedDeleted: 0,
			staleDeleted: 0,
		});
		expect(mockPrisma.webhookEvent.findMany).toHaveBeenCalledTimes(4);
		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenCalledTimes(4);
	});

	it("should delete completed webhook events older than 90 days", async () => {
		const completedIds = Array.from({ length: 15 }, (_, i) => ({ id: `c-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce(completedIds)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 15 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });

		const result = await cleanupOldWebhookEvents();

		expect(result.completedDeleted).toBe(15);

		const completedFindCall = mockPrisma.webhookEvent.findMany.mock.calls[0][0];
		expect(completedFindCall.where.status).toBe(WebhookEventStatus.COMPLETED);
		expect(completedFindCall.where.processedAt.lt).toBeInstanceOf(Date);
		expect(completedFindCall.select).toEqual({ id: true });
		expect(completedFindCall.take).toBe(1000);

		// Verify retention date (90 days ago)
		const retentionDate = completedFindCall.where.processedAt.lt;
		const expectedDate = new Date("2026-02-16T10:00:00Z");
		expectedDate.setTime(expectedDate.getTime() - RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000);
		expect(retentionDate.getTime()).toBe(expectedDate.getTime());

		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(1, {
			where: { id: { in: completedIds.map((e) => e.id) } },
		});
	});

	it("should delete failed webhook events older than 180 days", async () => {
		const failedIds = Array.from({ length: 8 }, (_, i) => ({ id: `f-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(failedIds)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 8 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });

		const result = await cleanupOldWebhookEvents();

		expect(result.failedDeleted).toBe(8);

		const failedFindCall = mockPrisma.webhookEvent.findMany.mock.calls[1][0];
		expect(failedFindCall.where.status).toBe(WebhookEventStatus.FAILED);
		expect(failedFindCall.where.processedAt.lt).toBeInstanceOf(Date);
		expect(failedFindCall.select).toEqual({ id: true });
		expect(failedFindCall.take).toBe(1000);

		// Verify retention date (180 days ago)
		const retentionDate = failedFindCall.where.processedAt.lt;
		const expectedDate = new Date("2026-02-16T10:00:00Z");
		expectedDate.setTime(expectedDate.getTime() - RETENTION.WEBHOOK_FAILED_DAYS * 24 * 60 * 60 * 1000);
		expect(retentionDate.getTime()).toBe(expectedDate.getTime());

		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(2, {
			where: { id: { in: failedIds.map((e) => e.id) } },
		});
	});

	it("should delete skipped events older than 90 days", async () => {
		const skippedIds = Array.from({ length: 12 }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(skippedIds)
			.mockResolvedValueOnce([]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 12 })
			.mockResolvedValueOnce({ count: 0 });

		const result = await cleanupOldWebhookEvents();

		expect(result.skippedDeleted).toBe(12);

		const skippedFindCall = mockPrisma.webhookEvent.findMany.mock.calls[2][0];
		expect(skippedFindCall.where.status).toBe(WebhookEventStatus.SKIPPED);
		expect(skippedFindCall.where.receivedAt.lt).toBeInstanceOf(Date);
		expect(skippedFindCall.select).toEqual({ id: true });
		expect(skippedFindCall.take).toBe(1000);

		// Verify retention date (90 days ago)
		const retentionDate = skippedFindCall.where.receivedAt.lt;
		const expectedDate = new Date("2026-02-16T10:00:00Z");
		expectedDate.setTime(expectedDate.getTime() - RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000);
		expect(retentionDate.getTime()).toBe(expectedDate.getTime());

		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(3, {
			where: { id: { in: skippedIds.map((e) => e.id) } },
		});
	});

	it("should delete stale PROCESSING/PENDING events older than 90 days", async () => {
		const staleIds = Array.from({ length: 3 }, (_, i) => ({ id: `st-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(staleIds);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 3 });

		const result = await cleanupOldWebhookEvents();

		expect(result.staleDeleted).toBe(3);

		const staleFindCall = mockPrisma.webhookEvent.findMany.mock.calls[3][0];
		expect(staleFindCall.where.status.in).toEqual([
			WebhookEventStatus.PROCESSING,
			WebhookEventStatus.PENDING,
		]);
		expect(staleFindCall.where.receivedAt.lt).toBeInstanceOf(Date);
		expect(staleFindCall.select).toEqual({ id: true });
		expect(staleFindCall.take).toBe(1000);

		// Verify retention date (90 days ago)
		const retentionDate = staleFindCall.where.receivedAt.lt;
		const expectedDate = new Date("2026-02-16T10:00:00Z");
		expectedDate.setTime(expectedDate.getTime() - RETENTION.WEBHOOK_STALE_DAYS * 24 * 60 * 60 * 1000);
		expect(retentionDate.getTime()).toBe(expectedDate.getTime());

		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(4, {
			where: { id: { in: staleIds.map((e) => e.id) } },
		});
	});

	it("should verify correct retention dates for all statuses", async () => {
		await cleanupOldWebhookEvents();

		const [completedFind, failedFind, skippedFind, staleFind] =
			mockPrisma.webhookEvent.findMany.mock.calls;

		// COMPLETED: 90 days
		const completedRetention = completedFind[0].where.processedAt.lt;
		expect(completedRetention.getTime()).toBe(
			new Date("2026-02-16T10:00:00Z").getTime() -
				RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000
		);

		// FAILED: 180 days
		const failedRetention = failedFind[0].where.processedAt.lt;
		expect(failedRetention.getTime()).toBe(
			new Date("2026-02-16T10:00:00Z").getTime() -
				RETENTION.WEBHOOK_FAILED_DAYS * 24 * 60 * 60 * 1000
		);

		// SKIPPED: 90 days
		const skippedRetention = skippedFind[0].where.receivedAt.lt;
		expect(skippedRetention.getTime()).toBe(
			new Date("2026-02-16T10:00:00Z").getTime() -
				RETENTION.WEBHOOK_COMPLETED_DAYS * 24 * 60 * 60 * 1000
		);

		// STALE: 90 days
		const staleRetention = staleFind[0].where.receivedAt.lt;
		expect(staleRetention.getTime()).toBe(
			new Date("2026-02-16T10:00:00Z").getTime() -
				RETENTION.WEBHOOK_STALE_DAYS * 24 * 60 * 60 * 1000
		);
	});

	it("should handle mixed deletion counts", async () => {
		const completedIds = Array.from({ length: 25 }, (_, i) => ({ id: `c-${i}` }));
		const failedIds = Array.from({ length: 10 }, (_, i) => ({ id: `f-${i}` }));
		const skippedIds = Array.from({ length: 5 }, (_, i) => ({ id: `s-${i}` }));
		const staleIds = Array.from({ length: 2 }, (_, i) => ({ id: `st-${i}` }));

		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce(completedIds)
			.mockResolvedValueOnce(failedIds)
			.mockResolvedValueOnce(skippedIds)
			.mockResolvedValueOnce(staleIds);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 25 })
			.mockResolvedValueOnce({ count: 10 })
			.mockResolvedValueOnce({ count: 5 })
			.mockResolvedValueOnce({ count: 2 });
		const result = await cleanupOldWebhookEvents();

		expect(result).toEqual({
			completedDeleted: 25,
			failedDeleted: 10,
			skippedDeleted: 5,
			staleDeleted: 2,
		});
		expect(mockPrisma.webhookEvent.findMany).toHaveBeenCalledTimes(4);
		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenCalledTimes(4);
	});

	it("should execute all operations in correct order", async () => {
		await cleanupOldWebhookEvents();

		// Verify findMany order: COMPLETED, FAILED, SKIPPED, STALE
		const findCalls = mockPrisma.webhookEvent.findMany.mock.calls;
		expect(findCalls[0][0].where.status).toBe(WebhookEventStatus.COMPLETED);
		expect(findCalls[1][0].where.status).toBe(WebhookEventStatus.FAILED);
		expect(findCalls[2][0].where.status).toBe(WebhookEventStatus.SKIPPED);
		expect(findCalls[3][0].where.status.in).toEqual([
			WebhookEventStatus.PROCESSING,
			WebhookEventStatus.PENDING,
		]);
	});

	it("should use processedAt for COMPLETED and FAILED status", async () => {
		await cleanupOldWebhookEvents();

		const [completedFind, failedFind] = mockPrisma.webhookEvent.findMany.mock.calls;

		expect(completedFind[0].where).toHaveProperty("processedAt");
		expect(failedFind[0].where).toHaveProperty("processedAt");
	});

	it("should use receivedAt for SKIPPED and STALE status", async () => {
		await cleanupOldWebhookEvents();

		const findCalls = mockPrisma.webhookEvent.findMany.mock.calls;
		const skippedFind = findCalls[2];
		const staleFind = findCalls[3];

		expect(skippedFind[0].where).toHaveProperty("receivedAt");
		expect(staleFind[0].where).toHaveProperty("receivedAt");
	});

	it("should pass found IDs to deleteMany", async () => {
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce([{ id: "c-abc" }, { id: "c-def" }])
			.mockResolvedValueOnce([{ id: "f-123" }])
			.mockResolvedValueOnce([{ id: "s-xyz" }, { id: "s-uvw" }, { id: "s-rst" }])
			.mockResolvedValueOnce([{ id: "st-1" }]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 2 })
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 3 })
			.mockResolvedValueOnce({ count: 1 });

		await cleanupOldWebhookEvents();

		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(1, {
			where: { id: { in: ["c-abc", "c-def"] } },
		});
		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(2, {
			where: { id: { in: ["f-123"] } },
		});
		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(3, {
			where: { id: { in: ["s-xyz", "s-uvw", "s-rst"] } },
		});
		expect(mockPrisma.webhookEvent.deleteMany).toHaveBeenNthCalledWith(4, {
			where: { id: { in: ["st-1"] } },
		});
	});

	it("should log warning when completed events delete limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const completedIds = Array.from({ length: 1000 }, (_, i) => ({ id: `c-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce(completedIds)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 1000 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });

		await cleanupOldWebhookEvents();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-webhook-events] Completed events delete limit reached, remaining will be cleaned on next run"
		);
	});

	it("should not log limit warning when under delete limit", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const completedIds = Array.from({ length: 999 }, (_, i) => ({ id: `c-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce(completedIds)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 999 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });

		await cleanupOldWebhookEvents();

		expect(consoleWarnSpy).not.toHaveBeenCalledWith(
			expect.stringContaining("delete limit reached")
		);
	});

	it("should log stale warning when stale events are deleted", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const staleIds = Array.from({ length: 5 }, (_, i) => ({ id: `st-${i}` }));
		mockPrisma.webhookEvent.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(staleIds);
		mockPrisma.webhookEvent.deleteMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 5 });

		await cleanupOldWebhookEvents();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-webhook-events] Deleted 5 stale PROCESSING/PENDING events"
		);
	});

	it("should use CLEANUP_DELETE_LIMIT as take value for all findMany calls", async () => {
		await cleanupOldWebhookEvents();

		const findCalls = mockPrisma.webhookEvent.findMany.mock.calls;
		for (const call of findCalls) {
			expect(call[0].take).toBe(1000);
		}
	});

	it("should select only id field in all findMany calls", async () => {
		await cleanupOldWebhookEvents();

		const findCalls = mockPrisma.webhookEvent.findMany.mock.calls;
		for (const call of findCalls) {
			expect(call[0].select).toEqual({ id: true });
		}
	});
});
