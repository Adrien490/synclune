import { describe, it, expect, vi, beforeEach } from "vitest";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";

const { mockRetryPendingPostWebhookTasks, mockLogger } = vi.hoisted(() => ({
	mockRetryPendingPostWebhookTasks: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/webhooks/services/post-webhook-tasks.service", () => ({
	retryPendingPostWebhookTasks: mockRetryPendingPostWebhookTasks,
}));

import { retryPostWebhookTasks } from "../retry-post-webhook-tasks.service";

/**
 * CRON-AUDIT-004 — couvre le seul cron `revenue` haute fréquence sans test
 * direct. Le cron est volontairement mince : il délègue à
 * `retryPendingPostWebhookTasks` (module webhooks) et agrège le `CronResult`.
 * On verrouille ici le mapping stats→CronResult + la borne `hasMore` (resumabilité).
 */
describe("retryPostWebhookTasks (CRON-AUDIT-004)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("délègue le batch à retryPendingPostWebhookTasks avec BATCH_SIZE_MEDIUM", async () => {
		mockRetryPendingPostWebhookTasks.mockResolvedValue({
			successful: 0,
			failed: 0,
			skipped: 0,
		});

		await retryPostWebhookTasks();

		expect(mockRetryPendingPostWebhookTasks).toHaveBeenCalledTimes(1);
		expect(mockRetryPendingPostWebhookTasks).toHaveBeenCalledWith(BATCH_SIZE_MEDIUM);
	});

	it("mappe stats → CronResult (successful→processed, failed→errored, skipped→skipped)", async () => {
		mockRetryPendingPostWebhookTasks.mockResolvedValue({
			successful: 3,
			failed: 2,
			skipped: 1,
		});

		const result = await retryPostWebhookTasks();

		expect(result.processed).toBe(3);
		expect(result.errored).toBe(2);
		expect(result.skipped).toBe(1);
	});

	it("hasMore=false quand processed+errored < BATCH_SIZE_MEDIUM", async () => {
		mockRetryPendingPostWebhookTasks.mockResolvedValue({
			successful: 10,
			failed: 5,
			skipped: 100, // skipped ne compte PAS dans la saturation du batch
		});

		const result = await retryPostWebhookTasks();

		expect(result.hasMore).toBe(false);
	});

	it("hasMore=true quand processed+errored sature le batch (reprise au run suivant)", async () => {
		mockRetryPendingPostWebhookTasks.mockResolvedValue({
			successful: BATCH_SIZE_MEDIUM - 2,
			failed: 2,
			skipped: 0,
		});

		const result = await retryPostWebhookTasks();

		expect(result.hasMore).toBe(true);
	});

	it("propage l'erreur si la délégation throw (laisse withCronGuard alerter)", async () => {
		mockRetryPendingPostWebhookTasks.mockRejectedValue(new Error("DB down"));

		await expect(retryPostWebhookTasks()).rejects.toThrow("DB down");
	});
});
