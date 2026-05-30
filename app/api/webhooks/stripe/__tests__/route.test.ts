import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks - must be declared before any imports
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
	mockCheckRateLimit,
	mockGetClientIp,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	STALE_PROCESSING_THRESHOLD_MS,
	WebhookEventStatus,
} = vi.hoisted(() => {
	const constructEvent = vi.fn();
	const nextResponseJson = vi.fn((body: unknown, init?: ResponseInit) => ({
		body,
		status: init?.status ?? 200,
	}));

	return {
		mockConstructEvent: constructEvent,
		mockStripe: {
			webhooks: {
				constructEvent,
			},
		},
		mockPrisma: {
			webhookEvent: {
				findUnique: vi.fn(),
				upsert: vi.fn(),
				update: vi.fn(),
			},
			// ORD-STRIPE-003 : $transaction utilisée pour persister tasks + update event atomique
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
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		MAX_WEBHOOK_RETRY_ATTEMPTS: 3,
		STALE_PROCESSING_THRESHOLD_MS: 15 * 60 * 1000,
		WebhookEventStatus: {
			PENDING: "PENDING",
			PROCESSING: "PROCESSING",
			COMPLETED: "COMPLETED",
			FAILED: "FAILED",
			SKIPPED: "SKIPPED",
		},
	};
});

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/server", () => ({
	NextResponse: {
		json: mockNextResponseJson,
	},
	after: mockAfter,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

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
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	STRIPE_WEBHOOK_LIMIT: { limit: 100, windowMs: 60_000 },
}));

import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

// Use fake timers to avoid timezone/runtime flakiness
const FIXED_NOW_MS = Date.UTC(2026, 0, 15, 12, 0, 0); // 2026-01-15T12:00:00Z
const NOW_SECONDS = Math.floor(FIXED_NOW_MS / 1000);

function makeStripeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_test_123",
		type: "checkout.session.completed",
		created: NOW_SECONDS - 10, // 10 seconds old - within the window
		data: { object: {} },
		...overrides,
	};
}

function makeWebhookRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "wh_record_1",
		stripeEventId: "evt_test_123",
		status: "PROCESSING",
		attempts: 0,
		...overrides,
	};
}

function makeRequest(body = '{"type":"checkout.session.completed"}') {
	return {
		text: vi.fn().mockResolvedValue(body),
	} as unknown as Request;
}

function makeHeadersList(signature: string | null = "t=123,v1=abc") {
	return {
		get: vi.fn((key: string) => (key === "stripe-signature" ? signature : null)),
	};
}

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(FIXED_NOW_MS);

	// Default: env vars present
	process.env.STRIPE_SECRET_KEY = "sk_test_123";
	process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

	// Default: valid headers with signature
	mockHeaders.mockResolvedValue(makeHeadersList("t=123,v1=valid_sig"));

	// Default: valid event returned from constructEvent
	mockConstructEvent.mockReturnValue(makeStripeEvent());

	// Default: no existing webhook event (not duplicate)
	mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);

	// Default: upsert returns a processing record with attempts=0
	mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord());

	// Default: update resolves successfully
	mockPrisma.webhookEvent.update.mockResolvedValue({});

	// Default: event type is supported
	mockIsEventSupported.mockReturnValue(true);

	// Default: dispatchEvent returns a successful result with no tasks
	mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });

	// Default: after() immediately calls the callback
	mockAfter.mockImplementation((fn: () => Promise<void>) => fn());

	// ORD-STRIPE-003 : $transaction runs the callback with the same mockPrisma
	// (tx === prisma) so persistPostWebhookTasks can be invoked with our spy.
	mockPrisma.$transaction.mockImplementation(
		async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
	);
	mockPersistPostWebhookTasks.mockResolvedValue({ created: 0 });
	mockExecutePersistedTasksForEvent.mockResolvedValue({ successful: 0, failed: 0, skipped: 0 });

	// Default: rate limit allows the request
	mockGetClientIp.mockResolvedValue("203.0.113.10");
	mockCheckRateLimit.mockResolvedValue({
		success: true,
		remaining: 99,
		limit: 100,
		reset: Date.now() + 60_000,
	});
});

// ============================================================================
// 0. Rate limit (pre-signature)
// ============================================================================

describe("POST /api/webhooks/stripe - rate limit", () => {
	it("returns 429 with Retry-After header when rate limit exceeded", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			remaining: 0,
			limit: 100,
			reset: Date.now() + 60_000,
			retryAfter: 42,
			error: "Trop de requêtes.",
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(429);
		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Rate limit exceeded" },
			{ status: 429, headers: { "Retry-After": "42" } },
		);
	});

	it("falls back to Retry-After: 60 when retryAfter is missing", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			remaining: 0,
			limit: 100,
			reset: Date.now() + 60_000,
			error: "Trop de requêtes.",
		});

		const req = makeRequest();
		await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Rate limit exceeded" },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	});

	it("does not call constructEvent when rate limit is exceeded", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			remaining: 0,
			limit: 100,
			reset: Date.now() + 60_000,
			error: "Trop de requêtes.",
		});

		const req = makeRequest();
		await POST(req);

		expect(mockConstructEvent).not.toHaveBeenCalled();
	});

	it("passes Stripe webhook identifier and IP to checkRateLimit", async () => {
		const req = makeRequest();
		await POST(req);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"stripe-webhook:203.0.113.10",
			{ limit: 100, windowMs: 60_000 },
			"203.0.113.10",
		);
	});

	it("uses 'unknown' identifier when client IP cannot be resolved", async () => {
		mockGetClientIp.mockResolvedValueOnce(null);

		const req = makeRequest();
		await POST(req);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"stripe-webhook:unknown",
			{ limit: 100, windowMs: 60_000 },
			null,
		);
	});
});

// ============================================================================
// 1. Environment variable validation
// ============================================================================

describe("POST /api/webhooks/stripe - env var validation", () => {
	it("should return 500 when STRIPE_SECRET_KEY is missing", async () => {
		delete process.env.STRIPE_SECRET_KEY;

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Internal server error" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
		delete process.env.STRIPE_WEBHOOK_SECRET;

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Internal server error" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when both env vars are missing", async () => {
		delete process.env.STRIPE_SECRET_KEY;
		delete process.env.STRIPE_WEBHOOK_SECRET;

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(500);
	});

	it("should not call constructEvent when env vars are missing", async () => {
		delete process.env.STRIPE_SECRET_KEY;

		const req = makeRequest();
		await POST(req);

		expect(mockConstructEvent).not.toHaveBeenCalled();
	});
});

// ============================================================================
// 2. Signature validation
// ============================================================================

describe("POST /api/webhooks/stripe - signature validation", () => {
	it("should return 400 when stripe-signature header is missing", async () => {
		mockHeaders.mockResolvedValue(makeHeadersList(null));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({ error: "No signature" }, { status: 400 });
		expect(response.status).toBe(400);
	});

	it("should not call constructEvent when signature is missing", async () => {
		mockHeaders.mockResolvedValue(makeHeadersList(null));

		const req = makeRequest();
		await POST(req);

		expect(mockConstructEvent).not.toHaveBeenCalled();
	});

	it("should return 400 when constructEvent throws (invalid signature)", async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error("No signatures found matching the expected signature for payload");
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Invalid signature" },
			{ status: 400 },
		);
		expect(response.status).toBe(400);
	});

	it("should return static error message when constructEvent throws a non-Error", async () => {
		mockConstructEvent.mockImplementation(() => {
			throw "not an error object";
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Invalid signature" },
			{ status: 400 },
		);
		expect(response.status).toBe(400);
	});

	it("should call constructEvent with body, signature, and webhook secret", async () => {
		const body = '{"id":"evt_test"}';
		const req = makeRequest(body);

		await POST(req);

		expect(mockConstructEvent).toHaveBeenCalledWith(body, "t=123,v1=valid_sig", "whsec_test_123");
	});
});

// ============================================================================
// 3. Anti-replay (delegated to constructEvent signature timestamp)
// ============================================================================

/**
 * @regression stripe-audit-2026-05-27 (ORD-STRIPE-003)
 *
 * Précédente régression (webhooks-audit-2026-05-17) ajoutait un check manuel
 * `event.created > 300s → 400` en plus de `constructEvent`. Analyse audit
 * 2026-05-27 a démontré que ce check rejetait les retries Stripe légitimes
 * (Stripe retry jusqu'à 3j en backoff exponentiel 1h/3h/6h/12h…). Le
 * `Stripe-Signature` header est régénéré à chaque retry avec un timestamp
 * frais ; `constructEvent` vérifie déjà ce timestamp (tolerance 300s du SDK).
 * `event.created` reste constant à travers les retries → check redondant et
 * contre-productif.
 *
 * Garde-fou : ne PAS rajouter de check manuel sur `event.created`. L'anti-replay
 * cryptographique est entièrement délégué à `constructEvent`.
 */
describe("POST /api/webhooks/stripe - anti-replay (signature timestamp)", () => {
	it("accepts a Stripe retry with old event.created (signature timestamp is fresh)", async () => {
		// Simule un retry Stripe à T+1h après l'événement initial. event.created
		// reste l'original (1h ancien) mais constructEvent (mocké) a déjà validé
		// le signature timestamp frais.
		const retriedEvent = makeStripeEvent({
			created: NOW_SECONDS - 3600,
		});
		mockConstructEvent.mockReturnValue(retriedEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(200);
		// Idempotence DB est consultée — l'event n'est plus court-circuité.
		expect(mockPrisma.webhookEvent.findUnique).toHaveBeenCalled();
	});

	it("accepts events at the legacy boundary (300s old) since constructEvent owns anti-replay", async () => {
		const edgeEvent = makeStripeEvent({
			created: NOW_SECONDS - 301,
		});
		mockConstructEvent.mockReturnValue(edgeEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(200);
	});

	it("accepts recent events normally", async () => {
		const recentEvent = makeStripeEvent({
			created: NOW_SECONDS - 30,
		});
		mockConstructEvent.mockReturnValue(recentEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(200);
	});
});

// ============================================================================
// 4. Idempotency - duplicate detection
// ============================================================================

describe("POST /api/webhooks/stripe - idempotency", () => {
	it("should return 200 with 'duplicate' when event status is COMPLETED", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.COMPLETED,
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "duplicate",
		});
		expect(response.status).toBe(200);
	});

	it("should return 200 with 'duplicate' when event status is SKIPPED", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.SKIPPED,
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "duplicate",
		});
		expect(response.status).toBe(200);
	});

	it("should not dispatch event when duplicate is detected", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.COMPLETED,
		});

		const req = makeRequest();
		await POST(req);

		expect(mockDispatchEvent).not.toHaveBeenCalled();
		expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
	});

	it("should query findUnique with the stripe event id", async () => {
		const event = makeStripeEvent({ id: "evt_unique_123" });
		mockConstructEvent.mockReturnValue(event);
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.findUnique).toHaveBeenCalledWith({
			where: { stripeEventId: "evt_unique_123" },
			select: { id: true, status: true, receivedAt: true, processingStartedAt: true },
		});
	});

	it("should continue processing when event status is FAILED (retry eligible)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.FAILED,
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it("should skip when event status is PROCESSING (concurrent webhook, fresh)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.PROCESSING,
			// Reçu il y a 5s → traitement live concurrent → court-circuit légitime.
			receivedAt: new Date(FIXED_NOW_MS - 5_000),
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({ received: true, status: "duplicate" });
	});
});

// ============================================================================
// 4b. Stale PROCESSING recovery (WEBHOOK-AUDIT-001)
// ============================================================================

/**
 * @regression webhook-stale-processing-2026-05-29 (WEBHOOK-AUDIT-001)
 *
 * Une lambda crashée/timeout en plein dispatch laisse le WebhookEvent figé en
 * PROCESSING. Avant ce correctif, le pré-check d'idempotence renvoyait 200
 * "duplicate" pour TOUT PROCESSING → la redélivrance légitime de Stripe était
 * avalée (Stripe considère l'event traité et arrête de réessayer), bloquant la
 * commande/refund/litige jusqu'au reset 24h du cron retry-webhooks.
 *
 * Garde-fou : un PROCESSING « frais » (< STALE_PROCESSING_THRESHOLD_MS, traitement
 * concurrent) est toujours court-circuité ; un PROCESSING « périmé » (au-delà,
 * crash certain car maxDuration=60s) doit être REPRIS (upsert + dispatch), pas
 * court-circuité. Ne PAS revenir à un skip inconditionnel sur PROCESSING.
 */
describe("POST /api/webhooks/stripe - stale PROCESSING recovery", () => {
	it("reprocesses a stale PROCESSING event instead of swallowing Stripe's retry", async () => {
		// Reçu il y a 20 min (> seuil 15 min) → lambda crashée → reprenable.
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_stale",
			status: WebhookEventStatus.PROCESSING,
			receivedAt: new Date(FIXED_NOW_MS - 20 * 60 * 1000),
		});
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_stale", attempts: 1 }),
		);

		const req = makeRequest();
		const response = await POST(req);

		// Pas de court-circuit : l'upsert reprend la main + dispatch ré-exécuté.
		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
		expect(mockDispatchEvent).toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({ received: true, status: "processed" });
	});

	it("still skips a PROCESSING event right at the freshness boundary", async () => {
		// Reçu il y a 14 min (< seuil 15 min) → encore considéré « frais ».
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_fresh_boundary",
			status: WebhookEventStatus.PROCESSING,
			receivedAt: new Date(FIXED_NOW_MS - 14 * 60 * 1000),
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
		expect(mockDispatchEvent).not.toHaveBeenCalled();
		expect(mockNextResponseJson).toHaveBeenCalledWith({ received: true, status: "duplicate" });
	});

	/**
	 * @regression webhook-cron-stripe-concurrent-2026-05-30 (WEBHOOK-AUDIT-002)
	 *
	 * Bug : la fraîcheur d'un PROCESSING était mesurée sur `receivedAt` (1ère
	 * réception, jamais rafraîchie). Quand le cron retry-webhooks reprenait un event
	 * FAILED, il le passait en PROCESSING mais laissait `receivedAt` ancien. Une
	 * redélivrance Stripe concurrente du même event voyait alors `receivedAt` > seuil
	 * → le considérait « périmé » → barge-in et DOUBLE-DISPATCH pendant que le cron
	 * le traitait encore (gardes aval @unique sauvaient l'intégrité, mais double
	 * email + travail dupliqué).
	 *
	 * Fix : la fraîcheur se lit sur `processingStartedAt` (début du traitement
	 * courant, (re)posé à chaque passage en PROCESSING par la route ET le cron). Un
	 * PROCESSING fraîchement repris (processingStartedAt récent) est court-circuité
	 * même si `receivedAt` est ancien.
	 *
	 * Garde-fou : ne PAS revenir à `receivedAt` pour la détection de fraîcheur.
	 */
	it("skips a freshly-reclaimed PROCESSING (recent processingStartedAt) despite an old receivedAt", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_cron_reclaimed",
			status: WebhookEventStatus.PROCESSING,
			// 1ère réception il y a 1h (event repris plusieurs fois)…
			receivedAt: new Date(FIXED_NOW_MS - 60 * 60 * 1000),
			// …mais le cron vient de relancer le traitement il y a 5s → frais.
			processingStartedAt: new Date(FIXED_NOW_MS - 5_000),
		});

		const req = makeRequest();
		const response = await POST(req);

		// Court-circuit : on ne barge PAS in sur le traitement concurrent du cron.
		expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
		expect(mockDispatchEvent).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({ received: true, status: "duplicate" });
	});

	it("reprocesses when processingStartedAt itself is stale (genuine crash)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_stale_processing_started",
			status: WebhookEventStatus.PROCESSING,
			receivedAt: new Date(FIXED_NOW_MS - 60 * 60 * 1000),
			// Traitement courant démarré il y a 20 min (> seuil 15 min) → lambda crashée.
			processingStartedAt: new Date(FIXED_NOW_MS - 20 * 60 * 1000),
		});
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_stale_processing_started", attempts: 1 }),
		);

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
		expect(mockDispatchEvent).toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({ received: true, status: "processed" });
	});
});

// ============================================================================
// 5. Upsert PROCESSING record
// ============================================================================

describe("POST /api/webhooks/stripe - upsert PROCESSING record", () => {
	it("should upsert webhook event as PROCESSING", async () => {
		const event = makeStripeEvent({ id: "evt_upsert_test", type: "payment_intent.succeeded" });
		mockConstructEvent.mockReturnValue(event);

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalledWith({
			where: { stripeEventId: "evt_upsert_test" },
			create: {
				stripeEventId: "evt_upsert_test",
				eventType: "payment_intent.succeeded",
				status: WebhookEventStatus.PROCESSING,
				// WEBHOOK-AUDIT-002 : horloge de fraîcheur du traitement courant.
				processingStartedAt: expect.any(Date),
			},
			update: {
				attempts: { increment: 1 },
				status: WebhookEventStatus.PROCESSING,
				processingStartedAt: expect.any(Date),
			},
		});
	});
});

// ============================================================================
// 6. Successful processing
// ============================================================================

describe("POST /api/webhooks/stripe - successful processing", () => {
	it("should return 200 with 'processed' on success", async () => {
		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "processed",
		});
		expect(response.status).toBe(200);
	});

	it("should dispatch the stripe event", async () => {
		const event = makeStripeEvent({ id: "evt_dispatch_test" });
		mockConstructEvent.mockReturnValue(event);

		const req = makeRequest();
		await POST(req);

		expect(mockDispatchEvent).toHaveBeenCalledWith(event);
	});

	it("should update webhook record to COMPLETED when dispatch returns no skipped flag", async () => {
		mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_completed" }));

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_completed" },
			data: {
				status: WebhookEventStatus.COMPLETED,
				processedAt: expect.any(Date),
			},
		});
	});

	it("should update webhook record to COMPLETED when dispatch returns null", async () => {
		mockDispatchEvent.mockResolvedValue(null);
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_null_result" }));

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_null_result" },
			data: {
				status: WebhookEventStatus.COMPLETED,
				processedAt: expect.any(Date),
			},
		});
	});
});

// ============================================================================
// 7. Skipped events (unhandled type)
// ============================================================================

describe("POST /api/webhooks/stripe - skipped events", () => {
	it("should skip unsupported event types and return 200 with 'skipped'", async () => {
		const unsupportedEvent = makeStripeEvent({ type: "customer.created" });
		mockConstructEvent.mockReturnValue(unsupportedEvent);
		mockIsEventSupported.mockReturnValue(false);
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_unsupported" }));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "skipped",
		});
		expect(response.status).toBe(200);
		expect(mockDispatchEvent).not.toHaveBeenCalled();
		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_unsupported" },
			data: {
				status: WebhookEventStatus.SKIPPED,
				processedAt: expect.any(Date),
			},
		});
	});

	it("should update webhook record to SKIPPED when dispatch returns skipped=true", async () => {
		mockDispatchEvent.mockResolvedValue({
			success: true,
			skipped: true,
			reason: "Unsupported event: customer.created",
		});
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_skipped" }));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_skipped" },
			data: {
				status: WebhookEventStatus.SKIPPED,
				processedAt: expect.any(Date),
			},
		});
		expect(response.status).toBe(200);
	});

	it("should still return 200 processed for skipped events", async () => {
		mockDispatchEvent.mockResolvedValue({ success: true, skipped: true });

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "processed",
		});
		expect(response.status).toBe(200);
	});
});

// ============================================================================
// 8. Post-webhook tasks via after()
// ============================================================================

describe("POST /api/webhooks/stripe - post-webhook tasks", () => {
	it("ORD-STRIPE-003: should persist tasks atomically then execute persisted via after()", async () => {
		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL", data: { orderId: "order-1" } },
			{ type: "INVALIDATE_CACHE", tags: ["orders-list"] },
		];
		mockDispatchEvent.mockResolvedValue({ success: true, tasks });

		const req = makeRequest();
		await POST(req);

		expect(mockPersistPostWebhookTasks).toHaveBeenCalledWith(mockPrisma, expect.any(String), tasks);
		expect(mockAfter).toHaveBeenCalledOnce();
		expect(mockExecutePersistedTasksForEvent).toHaveBeenCalledWith(expect.any(String));
	});

	it("should NOT call after() when tasks array is empty", async () => {
		mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).not.toHaveBeenCalled();
		expect(mockPersistPostWebhookTasks).not.toHaveBeenCalled();
		expect(mockExecutePersistedTasksForEvent).not.toHaveBeenCalled();
	});

	it("should NOT call after() when result is null (no tasks)", async () => {
		mockDispatchEvent.mockResolvedValue(null);

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).not.toHaveBeenCalled();
		expect(mockPersistPostWebhookTasks).not.toHaveBeenCalled();
		expect(mockExecutePersistedTasksForEvent).not.toHaveBeenCalled();
	});

	it("should NOT call after() when result has no tasks property", async () => {
		mockDispatchEvent.mockResolvedValue({ success: true });

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).not.toHaveBeenCalled();
	});

	it("should still return 200 processed before tasks execute", async () => {
		const tasks = [{ type: "INVALIDATE_CACHE", tags: ["products-list"] }];
		mockDispatchEvent.mockResolvedValue({ success: true, tasks });
		// after() is async but should not block the response
		mockAfter.mockImplementation(async (_fn: () => Promise<void>) => {
			// Do not call fn immediately - simulates deferred execution
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "processed",
		});
		expect(response.status).toBe(200);
	});
});

// ============================================================================
// 9. Failed processing
// ============================================================================

describe("POST /api/webhooks/stripe - failed processing", () => {
	it("should mark webhook record as FAILED when dispatchEvent throws", async () => {
		mockDispatchEvent.mockRejectedValue(new Error("Handler failed"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_failed" }));

		const req = makeRequest();
		// The outer catch returns 500
		await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_failed" },
			data: {
				status: WebhookEventStatus.FAILED,
				errorMessage: "Handler failed",
				processedAt: expect.any(Date),
			},
		});
	});

	it("should store error message string when error is not an Error instance", async () => {
		mockDispatchEvent.mockRejectedValue("string error");
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord({ id: "wh_str_err" }));

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "wh_str_err" },
			data: {
				status: WebhookEventStatus.FAILED,
				errorMessage: "string error",
				processedAt: expect.any(Date),
			},
		});
	});

	it("should return 500 when dispatchEvent throws (outer catch)", async () => {
		mockDispatchEvent.mockRejectedValue(new Error("Dispatch error"));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});
});

// ============================================================================
// 10. Admin alert on max retries
// ============================================================================

describe("POST /api/webhooks/stripe - admin alert on max retries", () => {
	it("should send admin alert when attempts >= MAX_WEBHOOK_RETRY_ATTEMPTS - 1", async () => {
		// MAX_WEBHOOK_RETRY_ATTEMPTS = 3, so alert triggers when attempts >= 2.
		// Realistic retry scenario: findUnique sees an existing FAILED record, so the
		// post-upsert race-guard (existingEvent===null && attempts>=1) does NOT trigger.
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_alert",
			status: WebhookEventStatus.FAILED,
		});
		mockDispatchEvent.mockRejectedValue(new Error("Persistent failure"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_alert", attempts: 2 }),
		);

		const event = makeStripeEvent({ id: "evt_alert", type: "checkout.session.completed" });
		mockConstructEvent.mockReturnValue(event);

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).toHaveBeenCalledOnce();
		expect(mockSendWebhookFailedAlert).toHaveBeenCalledWith({
			eventId: "evt_alert",
			eventType: "checkout.session.completed",
			attempts: 3, // webhookRecord.attempts + 1
			error: "Persistent failure",
		});
	});

	it("should NOT send admin alert when attempts < MAX_WEBHOOK_RETRY_ATTEMPTS - 1", async () => {
		// MAX_WEBHOOK_RETRY_ATTEMPTS = 3, so NO alert when attempts < 2.
		// First failure: no existing record, upsert hits create branch (attempts=0).
		mockDispatchEvent.mockRejectedValue(new Error("First failure"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_no_alert", attempts: 0 }),
		);

		const req = makeRequest();
		await POST(req);

		expect(mockSendWebhookFailedAlert).not.toHaveBeenCalled();
	});

	it("should NOT send admin alert when attempts is 1 (below threshold)", async () => {
		// Realistic retry: findUnique returns existing FAILED to bypass race-guard.
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_no_alert_2",
			status: WebhookEventStatus.FAILED,
		});
		mockDispatchEvent.mockRejectedValue(new Error("Second failure"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_no_alert_2", attempts: 1 }),
		);

		const req = makeRequest();
		await POST(req);

		expect(mockSendWebhookFailedAlert).not.toHaveBeenCalled();
	});

	it("should still mark event as FAILED even when alert is sent", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_failed_alerted",
			status: WebhookEventStatus.FAILED,
		});
		mockDispatchEvent.mockRejectedValue(new Error("Persistent failure"));
		mockSendWebhookFailedAlert.mockResolvedValue({ success: true });
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_failed_alerted", attempts: 2 }),
		);

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: WebhookEventStatus.FAILED,
				}),
			}),
		);
	});
});

// ============================================================================
// 11. Outer catch - returns 500
// ============================================================================

describe("POST /api/webhooks/stripe - outer catch", () => {
	it("should return 500 when headers() throws unexpectedly", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers unavailable"));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when prisma upsert throws unexpectedly", async () => {
		mockPrisma.webhookEvent.upsert.mockRejectedValue(new Error("DB connection lost"));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when req.text() throws", async () => {
		const brokenReq = {
			text: vi.fn().mockRejectedValue(new Error("Stream read error")),
		} as unknown as Request;

		const response = await POST(brokenReq);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when findUnique throws unexpectedly", async () => {
		mockPrisma.webhookEvent.findUnique.mockRejectedValue(new Error("Query timeout"));

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});
});

// ============================================================================
// 12. Full happy path - integration scenario
// ============================================================================

describe("POST /api/webhooks/stripe - full happy path", () => {
	it("should complete full processing pipeline in correct order", async () => {
		const callOrder: string[] = [];

		const event = makeStripeEvent({ id: "evt_full_test", type: "payment_intent.succeeded" });
		mockConstructEvent.mockReturnValue(event);
		mockPrisma.webhookEvent.findUnique.mockImplementation(async () => {
			callOrder.push("findUnique");
			return null;
		});
		mockPrisma.webhookEvent.upsert.mockImplementation(async () => {
			callOrder.push("upsert");
			return makeWebhookRecord({ id: "wh_full" });
		});
		mockDispatchEvent.mockImplementation(async () => {
			callOrder.push("dispatchEvent");
			return { success: true, tasks: [{ type: "INVALIDATE_CACHE", tags: ["products"] }] };
		});
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
				callOrder.push("transaction");
				return cb(mockPrisma);
			},
		);
		mockPrisma.webhookEvent.update.mockImplementation(async () => {
			callOrder.push("update");
			return {};
		});
		mockPersistPostWebhookTasks.mockImplementation(async () => {
			callOrder.push("persistPostWebhookTasks");
			return { created: 1 };
		});
		mockAfter.mockImplementation((fn: () => Promise<void>) => {
			callOrder.push("after");
			return fn();
		});
		mockExecutePersistedTasksForEvent.mockImplementation(async () => {
			callOrder.push("executePersistedTasksForEvent");
			return { successful: 1, failed: 0, skipped: 0 };
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(callOrder).toEqual([
			"findUnique",
			"upsert",
			"dispatchEvent",
			"transaction",
			"update",
			"persistPostWebhookTasks",
			"after",
			"executePersistedTasksForEvent",
		]);
		expect(response.status).toBe(200);
	});
});
