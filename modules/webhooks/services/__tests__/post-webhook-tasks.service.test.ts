/**
 * Couverture du cœur du DLQ post-webhook.
 *
 * Relevé par l'audit webhooks 2026-07-26 : `persistPostWebhookTasks`,
 * `executePersistedTasksForEvent` et `retryPendingPostWebhookTasks` n'avaient
 * aucun test propre, et `executeBatch` n'était couvert que sur ses 4 cas de claim
 * (`post-webhook-task-claim.regression.test.ts`). Restaient non couverts le chemin
 * d'épuisement, l'alerte `CRITICAL_EMAIL_TASKS`, la branche `INVALIDATE_CACHE` et
 * la déduplication DB — soit toute la partie qui décide si un email de commande
 * part ou meurt silencieusement. `MAX_POST_WEBHOOK_RETRY_ATTEMPTS` n'apparaissait
 * dans aucun test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockTx,
	mockDispatchEmailTask,
	mockRevalidateTagsInBackground,
	mockSendWebhookFailedAlertEmail,
} = vi.hoisted(() => ({
	mockPrisma: {
		postWebhookTask: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
	},
	mockTx: { postWebhookTask: { createMany: vi.fn() } },
	mockDispatchEmailTask: vi.fn(),
	mockRevalidateTagsInBackground: vi.fn(),
	mockSendWebhookFailedAlertEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
// Ce runner s'exécute en contexte route handler (`after()` du webhook + cron
// `retry-post-webhook-tasks`), où `updateTag` throw (E872). Il passe donc par
// `revalidateTagsInBackground`. C'est ce helper qu'on mocke ici — la légalité de
// l'API selon le contexte est prouvée SANS mock par
// `test/contract/cache-invalidation-context.contract.test.ts`, et l'exécution de
// bout en bout par `post-webhook-tasks.route-context.regression.test.ts`.
vi.mock("@/shared/lib/cache", () => ({
	revalidateTagsInBackground: mockRevalidateTagsInBackground,
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
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

import {
	persistPostWebhookTasks,
	executePersistedTasksForEvent,
	executeBatch,
} from "../post-webhook-tasks.service";
import { MAX_POST_WEBHOOK_RETRY_ATTEMPTS } from "../../constants/webhook.constants";

const emailRow = {
	id: "task-1",
	taskType: "ORDER_CONFIRMATION_EMAIL",
	payload: { to: "client@example.com", idempotencyKey: "order-confirm-1" },
	attempts: 0,
};

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.postWebhookTask.createMany.mockResolvedValue({ count: 1 });
	mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.postWebhookTask.update.mockResolvedValue({});
	mockPrisma.postWebhookTask.findMany.mockResolvedValue([]);
	mockSendWebhookFailedAlertEmail.mockResolvedValue(undefined);
});

describe("persistPostWebhookTasks", () => {
	it("no-op sans requête DB quand la liste est vide", async () => {
		const result = await persistPostWebhookTasks(mockTx as never, "we-1", []);

		expect(result).toEqual({ created: 0 });
		expect(mockTx.postWebhookTask.createMany).not.toHaveBeenCalled();
	});

	it("extrait l'idempotencyKey des tasks email et active skipDuplicates", async () => {
		await persistPostWebhookTasks(mockTx as never, "we-1", [
			{
				type: "ORDER_CONFIRMATION_EMAIL",
				data: { to: "a@b.c", idempotencyKey: "order-confirm-1" },
			} as never,
		]);

		const call = mockTx.postWebhookTask.createMany.mock.calls[0]![0];
		// C'est cette contrainte DB (idempotencyKey @unique) qui empêche un second
		// email quand le même webhook est rejoué.
		expect(call.skipDuplicates).toBe(true);
		expect(call.data[0]).toMatchObject({
			webhookEventId: "we-1",
			taskType: "ORDER_CONFIRMATION_EMAIL",
			idempotencyKey: "order-confirm-1",
			status: "PENDING",
		});
	});

	it("sérialise INVALIDATE_CACHE en { tags } et le laisse SANS clé d'idempotence", async () => {
		await persistPostWebhookTasks(mockTx as never, "we-1", [
			{ type: "INVALIDATE_CACHE", tags: ["orders-list"] } as never,
		]);

		expect(mockTx.postWebhookTask.createMany.mock.calls[0]![0].data[0]).toMatchObject({
			payload: { tags: ["orders-list"] },
			idempotencyKey: null,
		});
	});

	it("accepte un webhookEventId null (reprise cron d'un webhook perdu)", async () => {
		// WEBHOOK-AUDIT-003 : `sync-async-payments` rejoue les post-tasks sans
		// WebhookEvent à rattacher.
		await persistPostWebhookTasks(mockTx as never, null, [
			{ type: "ORDER_CONFIRMATION_EMAIL", data: { idempotencyKey: "k" } } as never,
		]);

		expect(mockTx.postWebhookTask.createMany.mock.calls[0]![0].data[0].webhookEventId).toBeNull();
	});
});

describe("executePersistedTasksForEvent", () => {
	it("ne sélectionne que les tasks non épuisées de l'événement", async () => {
		await executePersistedTasksForEvent("we-1");

		expect(mockPrisma.postWebhookTask.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					webhookEventId: "we-1",
					status: { in: ["PENDING", "FAILED"] },
					attempts: { lt: MAX_POST_WEBHOOK_RETRY_ATTEMPTS },
				},
			}),
		);
	});
});

describe("executeBatch — branche INVALIDATE_CACHE", () => {
	it("invalide chaque tag puis passe la task COMPLETED (sans passer par l'email)", async () => {
		const stats = await executeBatch([
			{
				id: "task-cache",
				taskType: "INVALIDATE_CACHE",
				payload: { tags: ["orders-list", "admin-badges"] },
				attempts: 0,
			},
		]);

		expect(mockRevalidateTagsInBackground).toHaveBeenCalledWith(["orders-list", "admin-badges"]);
		expect(mockDispatchEmailTask).not.toHaveBeenCalled();
		expect(stats).toEqual({ successful: 1, failed: 0, skipped: 0 });
	});
});

describe("executeBatch — épuisement et alerte", () => {
	it("repasse PENDING tant que le budget de tentatives n'est pas consommé", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("Resend down"));

		const stats = await executeBatch([{ ...emailRow, attempts: 0 }]);

		expect(mockPrisma.postWebhookTask.update).toHaveBeenCalledWith({
			where: { id: "task-1" },
			data: expect.objectContaining({ status: "PENDING", errorMessage: "Resend down" }),
		});
		expect(stats).toEqual({ successful: 0, failed: 1, skipped: 0 });
		// Pas d'alerte tant que la task reste rejouable.
		expect(mockSendWebhookFailedAlertEmail).not.toHaveBeenCalled();
	});

	it("bascule FAILED à la dernière tentative et alerte l'admin (task critique)", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("Resend down"));

		const stats = await executeBatch([
			{ ...emailRow, attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS - 1 },
		]);

		expect(mockPrisma.postWebhookTask.update).toHaveBeenCalledWith({
			where: { id: "task-1" },
			data: expect.objectContaining({ status: "FAILED" }),
		});
		expect(stats.failed).toBe(1);
		// Seul signal restant d'un email de commande définitivement perdu : cette
		// alerte est le dernier filet avant une perte silencieuse.
		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				eventId: "post-task-email-failure",
				eventType: "ORDER_CONFIRMATION_EMAIL",
				attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS,
			}),
		);
	});

	it("n'alerte pas pour une task épuisée NON critique", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("boom"));

		await executeBatch([
			{
				id: "task-2",
				taskType: "ADMIN_DISPUTE_ALERT",
				payload: {},
				attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS - 1,
			},
		]);

		expect(mockSendWebhookFailedAlertEmail).not.toHaveBeenCalled();
	});

	it("un échec d'envoi de l'alerte ne fait pas échouer le batch", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("Resend down"));
		mockSendWebhookFailedAlertEmail.mockRejectedValue(new Error("alert channel down"));

		await expect(
			executeBatch([{ ...emailRow, attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS - 1 }]),
		).resolves.toMatchObject({ failed: 1 });
	});

	it("un échec de persistance du statut ne fait pas échouer le batch (best-effort)", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("Resend down"));
		mockPrisma.postWebhookTask.update.mockRejectedValue(new Error("DB down"));

		// La task garde son ancien statut : le cron la reprendra.
		await expect(executeBatch([{ ...emailRow, attempts: 0 }])).resolves.toMatchObject({
			failed: 1,
		});
	});

	it("agrège plusieurs tasks critiques épuisées en une seule alerte", async () => {
		mockDispatchEmailTask.mockRejectedValue(new Error("Resend down"));

		await executeBatch([
			{ ...emailRow, id: "t1", attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS - 1 },
			{ ...emailRow, id: "t2", attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS - 1 },
		]);

		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledTimes(1);
	});
});
