/**
 * @regression webhook-retry-null-processed-at-2026-07-26
 *
 * WEBHOOK-AUDIT-003 — le DLQ webhook était inatteignable pour le scénario même
 * qu'il était censé couvrir.
 *
 * Chaîne du bug :
 *   1. La route crée le `WebhookEvent` en PROCESSING sans poser `processedAt`
 *      (branche `create` de l'upsert) — il reste donc NULL.
 *   2. La lambda crashe en plein dispatch : la ligne reste PROCESSING / NULL.
 *   3. Le reset stale du cron la bascule en FAILED, toujours sans `processedAt`.
 *   4. La sélection des candidats filtrait `processedAt: { lt: minAge }` — or en
 *      SQL `NULL < date` vaut NULL, jamais vrai. La ligne était donc EXCLUE et
 *      plus jamais rejouée.
 *
 * Perte silencieuse et définitive : aucune alerte non plus, l'épuisement n'étant
 * émis que par les `catch` de la route et du cron, dont aucun ne s'exécute.
 * Exposition maximale sur les litiges — `alert-dispute-deadlines` ne lit que les
 * lignes `Dispute` locales et n'interroge jamais Stripe, donc un
 * `charge.dispute.created` perdu n'a aucun autre filet.
 *
 * Ce test verrouille la clause OR (avec fallback `receivedAt`) et le tri qui
 * empêche les events jamais traités d'être relégués en fin de batch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockDispatchEvent,
	mockIsEventSupported,
	mockPersistPostWebhookTasks,
	mockExecutePersistedTasksForEvent,
	mockSentryStartSpan,
} = vi.hoisted(() => ({
	mockPrisma: {
		webhookEvent: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockStripe: { events: { retrieve: vi.fn() } },
	mockGetStripeClient: vi.fn(),
	mockDispatchEvent: vi.fn(),
	mockIsEventSupported: vi.fn(() => true),
	mockPersistPostWebhookTasks: vi.fn(),
	mockExecutePersistedTasksForEvent: vi.fn(),
	mockSentryStartSpan: vi.fn(async (_opts: unknown, cb: () => unknown) => cb()),
}));

vi.mock("@/modules/webhooks/services/alert.service", () => ({
	sendWebhookFailedAlert: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/stripe", () => ({ getStripeClient: mockGetStripeClient }));

vi.mock("@/modules/webhooks/utils/event-registry", () => ({
	dispatchEvent: mockDispatchEvent,
	isEventSupported: mockIsEventSupported,
}));

vi.mock("@/modules/webhooks/services/post-webhook-tasks.service", () => ({
	persistPostWebhookTasks: mockPersistPostWebhookTasks,
	executePersistedTasksForEvent: mockExecutePersistedTasksForEvent,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	withScope: vi.fn((cb: (scope: unknown) => void) =>
		cb({ setTag: vi.fn(), setLevel: vi.fn(), setFingerprint: vi.fn(), setContext: vi.fn() }),
	),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	WebhookEventStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		COMPLETED: "COMPLETED",
		FAILED: "FAILED",
		SKIPPED: "SKIPPED",
	},
	Prisma: {
		PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
			code: string;
			constructor(message: string, code: string) {
				super(message);
				this.code = code;
			}
		},
	},
}));

import { retryFailedWebhooks } from "../retry-webhooks.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";
import { MAX_WEBHOOK_RETRY_ATTEMPTS } from "@/modules/webhooks/constants/webhook.constants";

describe("@regression webhook-retry-null-processed-at — reprise des events jamais terminés", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		mockIsEventSupported.mockReturnValue(true);
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
		);
		mockPersistPostWebhookTasks.mockResolvedValue({ created: 0 });
		mockExecutePersistedTasksForEvent.mockResolvedValue({ successful: 0, failed: 0, skipped: 0 });
	});

	it("sélectionne les FAILED à processedAt NULL via un fallback sur receivedAt", async () => {
		// Horloge figée sur CE test seulement : il recalcule `minAge` après l'appel
		// et le comparait à un `Date.now()` distinct — 1 ms de dérive suffisait à le
		// faire échouer (~1 run sur 5). Les autres tests attendent un backoff réel,
		// d'où le scope local plutôt qu'un beforeEach global.
		vi.useFakeTimers();
		try {
			await retryFailedWebhooks();

			const where = mockPrisma.webhookEvent.findMany.mock.calls[0]![0].where;
			const minAge = new Date(Date.now() - THRESHOLDS.WEBHOOK_RETRY_MIN_AGE_MS);

			expect(where.status).toBe("FAILED");
			expect(where.attempts).toEqual({ lt: MAX_WEBHOOK_RETRY_ATTEMPTS });

			// Le cœur du correctif : sans la 2ᵉ branche, un event jamais terminé
			// (processedAt NULL) n'est JAMAIS candidat.
			expect(where.OR).toHaveLength(2);
			expect(where.OR[0].processedAt.lt.getTime()).toBe(minAge.getTime());
			expect(where.OR[1].processedAt).toBeNull();
			expect(where.OR[1].receivedAt.lt.getTime()).toBe(minAge.getTime());

			// Un filtre `processedAt` de premier niveau ré-exclurait les NULL et
			// annulerait le fallback.
			expect(where.processedAt).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("trie sur receivedAt : en ASC, Postgres relègue les NULL de processedAt en dernier", async () => {
		await retryFailedWebhooks();

		// Les events jamais traités sont les plus à risque (paiement encaissé, litige
		// non enregistré) — ils ne doivent pas se retrouver en fin de batch, donc hors
		// du `take` quand la file est pleine.
		expect(mockPrisma.webhookEvent.findMany.mock.calls[0]![0].orderBy).toEqual({
			receivedAt: "asc",
		});
	});

	it("rejoue effectivement un event réanimé par le reset stale (processedAt NULL)", async () => {
		// Ligne telle que la laisse le reset stale : FAILED, jamais terminée.
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce([
			{
				id: "we-crashed",
				stripeEventId: "evt_dispute_created",
				eventType: "charge.dispute.created",
				attempts: 0,
			},
		]);
		mockStripe.events.retrieve.mockResolvedValue({
			id: "evt_dispute_created",
			type: "charge.dispute.created",
		});
		mockDispatchEvent.mockResolvedValue({ success: true });

		const result = await retryFailedWebhooks();

		expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
		expect(result.processed).toBe(1);
		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "we-crashed" }),
				data: expect.objectContaining({ status: "COMPLETED" }),
			}),
		);
	});

	it("le reset stale laisse bien processedAt intact — d'où la nécessité du fallback", async () => {
		await retryFailedWebhooks();

		// Si ce reset posait un `processedAt`, le fallback ci-dessus serait inutile.
		// Le verrouiller documente le couplage entre les deux requêtes.
		const resetCall = mockPrisma.webhookEvent.updateMany.mock.calls[0]![0];
		expect(resetCall.where.status).toBe("PROCESSING");
		expect(resetCall.data).toEqual({ status: "FAILED" });
		expect(resetCall.data.processedAt).toBeUndefined();
	});
});
