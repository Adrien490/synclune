import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression idem-task-001-claim-before-execute
 *
 * Audit idempotence 2026-07-02 (P2-1) — double exécution d'une PostWebhookTask.
 *
 * Bug verrouillé : `executeBatch` exécutait la task (envoi email) PUIS posait
 * COMPLETED, sans claim préalable. Le runner `after()` de la route webhook et
 * le cron `retry-post-webhook-tasks` pouvaient sélectionner la MÊME task
 * PENDING et l'envoyer chacun — double email, neutralisé seulement en aval
 * (clé Resend 24h, flag refund).
 *
 * Fix : claim optimiste `updateMany({id, attempts: N, status: PENDING|FAILED}
 * → attempts: N+1)` AVANT exécution. Un seul runner gagne l'incrément ;
 * l'autre obtient count=0 et skip. Crash post-claim : attempts incrémenté,
 * status inchangé → la task reste éligible au retry (at-least-once préservé).
 */

const { mockPrisma, mockDispatchEmailTask, mockUpdateTag, mockLogger, mockSendAlert } = vi.hoisted(
	() => ({
		mockPrisma: {
			postWebhookTask: {
				findMany: vi.fn(),
				update: vi.fn(),
				updateMany: vi.fn(),
				createMany: vi.fn(),
			},
		},
		mockDispatchEmailTask: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockSendAlert: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendWebhookFailedAlertEmail: mockSendAlert,
}));
vi.mock("../../utils/dispatch-email-task", () => ({
	CRITICAL_EMAIL_TASKS: new Set(["ORDER_CONFIRMATION_EMAIL"]),
	dispatchEmailTask: mockDispatchEmailTask,
}));

import { executeBatch } from "../post-webhook-tasks.service";

const emailTaskRow = {
	id: "task-1",
	taskType: "ORDER_CONFIRMATION_EMAIL",
	payload: { to: "client@example.fr", idempotencyKey: "order-confirm-order-1" },
	attempts: 0,
};

describe("@regression IDEM-TASK-001 — claim optimiste avant exécution", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.postWebhookTask.update.mockResolvedValue({});
	});

	it("claim gagné : la task est exécutée puis passée COMPLETED (sans re-bump attempts)", async () => {
		mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 1 });
		mockDispatchEmailTask.mockResolvedValue(undefined);

		const stats = await executeBatch([emailTaskRow]);

		// Le claim ré-évalue attempts + status au lock de ligne.
		// WEBHOOK-AUDIT-003 : il horodate aussi `lastAttemptAt`, qui alimente le
		// backoff par paliers de retry-post-webhook-tasks.
		expect(mockPrisma.postWebhookTask.updateMany).toHaveBeenCalledWith({
			where: { id: "task-1", attempts: 0, status: { in: ["PENDING", "FAILED"] } },
			data: { attempts: 1, lastAttemptAt: expect.any(Date) },
		});
		expect(mockDispatchEmailTask).toHaveBeenCalledTimes(1);
		// attempts déjà incrémenté par le claim — COMPLETED ne le re-bump pas.
		expect(mockPrisma.postWebhookTask.update).toHaveBeenCalledWith({
			where: { id: "task-1" },
			data: expect.objectContaining({ status: "COMPLETED" }),
		});
		const completedData = mockPrisma.postWebhookTask.update.mock.calls[0]?.[0]?.data;
		expect(completedData).not.toHaveProperty("attempts");
		expect(stats).toEqual({ successful: 1, failed: 0, skipped: 0 });
	});

	it("claim PERDU (runner concurrent) : AUCUN envoi email, compté skipped", async () => {
		mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 0 });

		const stats = await executeBatch([emailTaskRow]);

		expect(mockDispatchEmailTask).not.toHaveBeenCalled();
		expect(mockPrisma.postWebhookTask.update).not.toHaveBeenCalled();
		expect(stats).toEqual({ successful: 0, failed: 0, skipped: 1 });
	});

	it("l'ordre est claim PUIS exécution (le claim n'arrive jamais après l'envoi)", async () => {
		mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 1 });
		mockDispatchEmailTask.mockResolvedValue(undefined);

		await executeBatch([emailTaskRow]);

		const claimOrder = mockPrisma.postWebhookTask.updateMany.mock.invocationCallOrder[0];
		const dispatchOrder = mockDispatchEmailTask.mock.invocationCallOrder[0];
		expect(claimOrder).toBeLessThan(dispatchOrder!);
	});

	it("échec post-claim : status re-PENDING (retry cron), attempts non re-bumpé", async () => {
		mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 1 });
		mockDispatchEmailTask.mockRejectedValue(new Error("SMTP down"));

		const stats = await executeBatch([emailTaskRow]);

		expect(stats.failed).toBe(1);
		expect(mockPrisma.postWebhookTask.update).toHaveBeenCalledWith({
			where: { id: "task-1" },
			data: expect.objectContaining({ status: "PENDING", errorMessage: "SMTP down" }),
		});
		const failData = mockPrisma.postWebhookTask.update.mock.calls[0]?.[0]?.data;
		expect(failData).not.toHaveProperty("attempts");
	});
});
