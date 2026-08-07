/**
 * @regression webhooks-audit-2026-05-17
 *
 * Bug : 2 webhooks Stripe concurrents (re-livraison + livraison normale)
 * pouvaient slipper la race-guard upsert dans `route.ts`. La 1ère thread
 * faisait `findUnique → null`, la 2e idem ; toutes deux entraient dans
 * l'upsert qui hit la branche UPDATE → traitement dupliqué (P2002 ignoré).
 *
 * Fix initial : (a) race-guard `existingEvent === null && webhookRecord.attempts
 * >= 1 → return duplicate` ajouté après upsert. (b) Le mock Prisma DOIT throw une
 * vraie subclass `Prisma.PrismaClientKnownRequestError` via `vi.hoisted` +
 * `vi.mock("@/app/generated/prisma/client", () => ({ Prisma: { ... } }))`.
 *
 * MISE À JOUR IDEM-ROUTE-001 (audit idempotence 2026-07-26) : l'`upsert` a été
 * remplacé par `create` (1ʳᵉ réception, collision = vrai P2002) + un claim
 * CONDITIONNEL `updateMany({status, attempts})` pour les reprises. Le point (a)
 * est donc superseded par une garde plus forte (contrainte DB + claim optimiste) ;
 * le point (b) reste impératif. L'ancien upsert écrivait PROCESSING sans
 * ré-asserter le statut lu, ce qui laissait la route et le cron retry-webhooks
 * dispatcher le même event FAILED en parallèle.
 * Un `Object.assign(new Error(), { code: "P2002" })` n'est PAS `instanceof
 * PrismaClientKnownRequestError` → la branche outer-catch n'est jamais hit
 * et le test passe "green for the wrong reason".
 *
 * Garde-fou : ne PAS revenir à un mock-by-shape pour l'erreur P2002 — il
 * doit rester une subclass réelle pour exécuter la branche outer-catch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockConstructEvent,
	mockStripe,
	mockPrisma,
	mockNextResponseJson,
	mockAfter,
	mockHeaders,
	mockDispatchEvent,
	mockIsEventSupported,
	mockPersistPostWebhookTasks,
	mockExecutePersistedTasksForEvent,
	mockSendWebhookFailedAlert,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	STALE_PROCESSING_THRESHOLD_MS,
	WebhookEventStatus,
	PrismaClientKnownRequestError,
} = vi.hoisted(() => {
	const constructEvent = vi.fn();
	const nextResponseJson = vi.fn((body: unknown, init?: ResponseInit) => ({
		body,
		status: init?.status ?? 200,
	}));

	// Real subclass so `e instanceof Prisma.PrismaClientKnownRequestError` in the
	// route resolves truthy. Object.assign(new Error, {code}) is NOT an instance
	// and would silently fall through to the outer catch (testing the wrong path).
	class PrismaClientKnownRequestError extends Error {
		code: string;
		clientVersion = "test";
		constructor(message: string, opts: { code: string }) {
			super(message);
			this.code = opts.code;
			this.name = "PrismaClientKnownRequestError";
		}
	}

	return {
		mockConstructEvent: constructEvent,
		mockStripe: { webhooks: { constructEvent } },
		mockPrisma: {
			webhookEvent: {
				findUnique: vi.fn(),
				// IDEM-ROUTE-001 : create (1ʳᵉ réception) + updateMany (claim de reprise).
				create: vi.fn(),
				updateMany: vi.fn(),
				update: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockNextResponseJson: nextResponseJson,
		mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
		mockHeaders: vi.fn(),
		mockDispatchEvent: vi.fn(),
		mockIsEventSupported: vi.fn(),
		mockPersistPostWebhookTasks: vi.fn(),
		mockExecutePersistedTasksForEvent: vi.fn(),
		mockSendWebhookFailedAlert: vi.fn(),
		MAX_WEBHOOK_RETRY_ATTEMPTS: 3,
		// Route lit cette constante (WEBHOOK-AUDIT-001). Doit être exportée par le
		// mock sinon l'accès throw "No export defined" → 500. 15 min comme en prod.
		STALE_PROCESSING_THRESHOLD_MS: 15 * 60 * 1000,
		WebhookEventStatus: {
			PENDING: "PENDING",
			PROCESSING: "PROCESSING",
			COMPLETED: "COMPLETED",
			FAILED: "FAILED",
			SKIPPED: "SKIPPED",
		},
		PrismaClientKnownRequestError,
	};
});

vi.mock("@/shared/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/server", () => ({
	NextResponse: { json: mockNextResponseJson },
	after: mockAfter,
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/modules/webhooks/utils/event-registry", () => ({
	dispatchEvent: mockDispatchEvent,
	isEventSupported: mockIsEventSupported,
}));
vi.mock("@/modules/webhooks/services/post-webhook-tasks.service", () => ({
	persistPostWebhookTasks: mockPersistPostWebhookTasks,
	executePersistedTasksForEvent: mockExecutePersistedTasksForEvent,
}));
vi.mock("@/modules/webhooks/services/alert.service", () => ({
	sendWebhookFailedAlert: mockSendWebhookFailedAlert,
}));
vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	STALE_PROCESSING_THRESHOLD_MS,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	WebhookEventStatus,
	Prisma: { PrismaClientKnownRequestError },
}));

import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

const FIXED_NOW_MS = Date.UTC(2026, 0, 15, 12, 0, 0);
const NOW_SECONDS = Math.floor(FIXED_NOW_MS / 1000);

function makeStripeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_test_concurrent_1",
		type: "payment_intent.succeeded",
		created: NOW_SECONDS - 10,
		data: { object: {} },
		...overrides,
	};
}

function makeWebhookRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "wh-1",
		eventId: "evt_test_concurrent_1",
		eventType: "payment_intent.succeeded",
		status: "PROCESSING",
		attempts: 0,
		// Colonne DB (default now()) lue par la route depuis WEBHOOK-AUDIT-001
		// (détection PROCESSING périmé). Fraîche par défaut (fake timers = FIXED_NOW_MS)
		// → PROCESSING traité comme "live concurrent", pas comme stale.
		receivedAt: new Date(),
		...overrides,
	};
}

function makeRequest(body = '{"type":"payment_intent.succeeded"}') {
	return {
		text: vi.fn().mockResolvedValue(body),
	} as unknown as Request;
}

function makeHeadersList(signature = "t=123,v1=valid") {
	return {
		get: vi.fn((key: string) => (key === "stripe-signature" ? signature : null)),
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("Webhook concurrency - duplicate event processing", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW_MS);

		process.env.STRIPE_SECRET_KEY = "sk_test_123";
		process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

		mockHeaders.mockResolvedValue(makeHeadersList());
		mockConstructEvent.mockReturnValue(makeStripeEvent());
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
		mockPrisma.webhookEvent.create.mockResolvedValue(makeWebhookRecord());
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		mockIsEventSupported.mockReturnValue(true);
		mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });
		mockAfter.mockImplementation((fn: () => Promise<void>) => fn());
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
		);
		mockPersistPostWebhookTasks.mockResolvedValue({ created: 0 });
		mockExecutePersistedTasksForEvent.mockResolvedValue({
			successful: 0,
			failed: 0,
			skipped: 0,
		});
	});

	it("should detect duplicate event via COMPLETED status and return 200", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(
			makeWebhookRecord({ status: "COMPLETED" }),
		);

		const result = await POST(makeRequest());

		expect(result.status).toBe(200);
		expect(mockDispatchEvent).not.toHaveBeenCalled();
	});

	it("should detect duplicate event via SKIPPED status and return 200", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(makeWebhookRecord({ status: "SKIPPED" }));

		const result = await POST(makeRequest());

		expect(result.status).toBe(200);
		expect(mockDispatchEvent).not.toHaveBeenCalled();
	});

	it("should retry FAILED events (not treat as duplicate)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(
			makeWebhookRecord({ status: "FAILED", attempts: 2 }),
		);

		const result = await POST(makeRequest());

		expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
		expect(result.status).toBe(200);
	});

	it("should skip PROCESSING events (concurrent webhook protection)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(
			makeWebhookRecord({ status: "PROCESSING", attempts: 1 }),
		);

		const result = await POST(makeRequest());

		expect(mockPrisma.webhookEvent.create).not.toHaveBeenCalled();
		expect(mockPrisma.webhookEvent.updateMany).not.toHaveBeenCalled();
		expect(result.status).toBe(200);
	});

	it("should handle concurrent duplicate events gracefully", async () => {
		const event = makeStripeEvent();
		mockConstructEvent.mockReturnValue(event);

		// First call: no existing record → processes normally
		// Second call: sees PROCESSING status from first → skips (duplicate)
		mockPrisma.webhookEvent.findUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeWebhookRecord({ status: "PROCESSING" }));

		const [result1, result2] = await Promise.all([POST(makeRequest()), POST(makeRequest())]);

		// Both should return 200 (no 5xx errors)
		expect(result1.status).toBe(200);
		expect(result2.status).toBe(200);
	});

	it("should return 200 'duplicate' when upsert hits P2002 unique constraint race", async () => {
		// Use a real PrismaClientKnownRequestError subclass — `Object.assign(new Error, {code})`
		// is NOT an instance, so the route's P2002 branch would never fire and the test
		// would silently pass via the outer catch (testing the wrong behavior).
		mockPrisma.webhookEvent.create.mockRejectedValue(
			new PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002" }),
		);

		const result = await POST(makeRequest());

		expect(result.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "duplicate",
		});
		expect(mockDispatchEvent).not.toHaveBeenCalled();
	});

	it("should rethrow non-P2002 Prisma errors to outer catch (500)", async () => {
		mockPrisma.webhookEvent.create.mockRejectedValue(
			new PrismaClientKnownRequestError("Connection lost", { code: "P1001" }),
		);

		const result = await POST(makeRequest());

		expect(result.status).toBe(500);
	});

	// IDEM-ROUTE-001 : remplace l'ancien test « race-guard post-upsert (existingEvent=null
	// mais attempts>=1) ». Cette heuristique sur `attempts` n'existe plus : la 1ʳᵉ
	// réception passe par un `create`, donc une création concurrente lève un vrai P2002
	// (testé ci-dessus) au lieu de retomber silencieusement sur une branche `update`.
	// La garde est désormais la contrainte d'unicité DB, strictement plus forte qu'un
	// compteur lu après écriture.
	it("never resurfaces a pre-existing row through the create path (no silent update branch)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);

		await POST(makeRequest());

		// Branche 1ʳᵉ réception : `create` seul. Aucun `updateMany` (ce serait une
		// reprise) et aucun `upsert` (qui masquerait la collision en update silencieux).
		expect(mockPrisma.webhookEvent.create).toHaveBeenCalledTimes(1);
		expect(mockPrisma.webhookEvent.updateMany).not.toHaveBeenCalled();
		expect(mockPrisma.webhookEvent).not.toHaveProperty("upsert");
	});
});
