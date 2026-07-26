/**
 * @regression post-webhook-task-backoff-2026-07-26
 *
 * WEBHOOK-AUDIT-003 — le DLQ des post-tasks n'avait AUCUN backoff.
 *
 * `retryPendingPostWebhookTasks` sélectionnait sur `status + attempts` seuls, à la
 * cadence fixe de 5 min du cron : les 5 tentatives d'une task étaient donc brûlées
 * en ~20 min. Toute indisponibilité Resend plus longue mettait la confirmation de
 * commande en dead-letter DÉFINITIF (le filtre `attempts < MAX` l'exclut ensuite
 * pour toujours, sans surface de requeue). Le commentaire de
 * `MAX_POST_WEBHOOK_RETRY_ATTEMPTS` annonçait par ailleurs « ~30s de backoff cron »,
 * chiffre qui ne correspondait à rien.
 *
 * Les paliers portent le budget à ~3 h sans allonger le chemin nominal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockDispatchEmailTask, mockUpdateTag, mockSendWebhookFailedAlertEmail } =
	vi.hoisted(() => ({
		mockPrisma: {
			postWebhookTask: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
		},
		mockDispatchEmailTask: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockSendWebhookFailedAlertEmail: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendWebhookFailedAlertEmail: mockSendWebhookFailedAlertEmail,
}));
vi.mock("../../utils/dispatch-email-task", () => ({
	dispatchEmailTask: mockDispatchEmailTask,
	CRITICAL_EMAIL_TASKS: new Set(["ORDER_CONFIRMATION_EMAIL"]),
}));
vi.mock("@/app/generated/prisma/client", () => ({
	PostWebhookTaskStatus: { PENDING: "PENDING", COMPLETED: "COMPLETED", FAILED: "FAILED" },
}));

import { retryPendingPostWebhookTasks } from "../post-webhook-tasks.service";
import {
	MAX_POST_WEBHOOK_RETRY_ATTEMPTS,
	POST_WEBHOOK_RETRY_BACKOFF_MS,
} from "../../constants/webhook.constants";

describe("@regression post-webhook-task-backoff — paliers de retry du DLQ", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-26T12:00:00Z"));
		mockPrisma.postWebhookTask.findMany.mockResolvedValue([]);
	});

	it("un palier par valeur d'attempts, borné par MAX (les tasks épuisées sortent d'elles-mêmes)", () => {
		expect(POST_WEBHOOK_RETRY_BACKOFF_MS).toHaveLength(MAX_POST_WEBHOOK_RETRY_ATTEMPTS);
		// Croissance stricte : un palier plat rendrait le backoff inopérant.
		for (let i = 1; i < POST_WEBHOOK_RETRY_BACKOFF_MS.length; i++) {
			expect(POST_WEBHOOK_RETRY_BACKOFF_MS[i]!).toBeGreaterThan(
				POST_WEBHOOK_RETRY_BACKOFF_MS[i - 1]!,
			);
		}
		// Le budget total doit rester nettement au-dessus des ~20 min d'origine.
		const budget = POST_WEBHOOK_RETRY_BACKOFF_MS.reduce((a, b) => a + b, 0);
		expect(budget).toBeGreaterThan(2 * 60 * 60 * 1000);
	});

	it("construit une clause OR par palier, indexée sur attempts", async () => {
		await retryPendingPostWebhookTasks(25);

		const where = mockPrisma.postWebhookTask.findMany.mock.calls[0]![0].where;
		expect(where.status).toEqual({ in: ["PENDING", "FAILED"] });
		expect(where.OR).toHaveLength(MAX_POST_WEBHOOK_RETRY_ATTEMPTS);

		// attempts: 0 (jamais tentée) reste immédiatement éligible — le chemin
		// nominal (after() de la route) ne doit pas être ralenti.
		expect(where.OR[0]).toEqual({ attempts: 0 });

		// Les paliers suivants exigent que la dernière tentative soit assez ancienne.
		for (let attempts = 1; attempts < MAX_POST_WEBHOOK_RETRY_ATTEMPTS; attempts++) {
			const clause = where.OR[attempts];
			expect(clause.attempts).toBe(attempts);
			const cutoff = clause.OR[1].lastAttemptAt.lt as Date;
			expect(Date.now() - cutoff.getTime()).toBe(POST_WEBHOOK_RETRY_BACKOFF_MS[attempts]);
		}
	});

	it("garde les lignes legacy éligibles (lastAttemptAt NULL, écrites avant migration)", async () => {
		await retryPendingPostWebhookTasks(25);

		const where = mockPrisma.postWebhookTask.findMany.mock.calls[0]![0].where;
		for (let attempts = 1; attempts < MAX_POST_WEBHOOK_RETRY_ATTEMPTS; attempts++) {
			// Fail-open, même parti pris que `processingStartedAt ?? receivedAt`.
			expect(where.OR[attempts].OR[0]).toEqual({ lastAttemptAt: null });
		}
	});

	it("n'applique plus de filtre attempts de premier niveau (il est porté par les paliers)", async () => {
		await retryPendingPostWebhookTasks(25);

		const where = mockPrisma.postWebhookTask.findMany.mock.calls[0]![0].where;
		// Un `attempts: { lt: MAX }` résiduel au premier niveau entrerait en conflit
		// avec les `attempts: <n>` exacts des paliers et viderait la sélection.
		expect(where.attempts).toBeUndefined();
	});
});
