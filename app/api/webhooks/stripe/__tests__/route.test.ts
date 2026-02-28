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
	mockExecutePostWebhookTasks,
	mockSendWebhookFailedAlert,
	ANTI_REPLAY_WINDOW_SECONDS,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
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
		},
		mockNextResponseJson: nextResponseJson,
		mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
		mockHeaders: vi.fn(),
		mockDispatchEvent: vi.fn(),
		mockExecutePostWebhookTasks: vi.fn(),
		mockSendWebhookFailedAlert: vi.fn(),
		ANTI_REPLAY_WINDOW_SECONDS: 300,
		MAX_WEBHOOK_RETRY_ATTEMPTS: 3,
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
}));

vi.mock("@/modules/webhooks/utils/execute-post-tasks", () => ({
	executePostWebhookTasks: mockExecutePostWebhookTasks,
}));

vi.mock("@/modules/webhooks/services/alert.service", () => ({
	sendWebhookFailedAlert: mockSendWebhookFailedAlert,
}));

vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({
	ANTI_REPLAY_WINDOW_SECONDS,
}));

vi.mock("@/modules/cron/constants/limits", () => ({
	MAX_WEBHOOK_RETRY_ATTEMPTS,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	WebhookEventStatus,
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

	// Default: dispatchEvent returns a successful result with no tasks
	mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });

	// Default: after() immediately calls the callback
	mockAfter.mockImplementation((fn: () => Promise<void>) => fn());
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
			{ error: "Stripe configuration missing" },
			{ status: 500 },
		);
		expect(response.status).toBe(500);
	});

	it("should return 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
		delete process.env.STRIPE_WEBHOOK_SECRET;

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Stripe configuration missing" },
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
// 3. Anti-replay check
// ============================================================================

describe("POST /api/webhooks/stripe - anti-replay check", () => {
	it("should return 400 when event is older than ANTI_REPLAY_WINDOW_SECONDS", async () => {
		const oldEvent = makeStripeEvent({
			created: NOW_SECONDS - 301, // 301 seconds old - exceeds the 300s window
		});
		mockConstructEvent.mockReturnValue(oldEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(mockNextResponseJson).toHaveBeenCalledWith(
			{ error: "Event too old (anti-replay protection)" },
			{ status: 400 },
		);
		expect(response.status).toBe(400);
	});

	it("should return 400 when event is exactly at the boundary (eventAgeSeconds > window)", async () => {
		const oldEvent = makeStripeEvent({
			created: NOW_SECONDS - (ANTI_REPLAY_WINDOW_SECONDS + 1),
		});
		mockConstructEvent.mockReturnValue(oldEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(400);
	});

	it("should NOT reject events within the anti-replay window", async () => {
		const recentEvent = makeStripeEvent({
			created: NOW_SECONDS - 299, // 299 seconds old - within the 300s window
		});
		mockConstructEvent.mockReturnValue(recentEvent);

		const req = makeRequest();
		const response = await POST(req);

		expect(response.status).toBe(200);
	});

	it("should NOT reject events at exactly the window boundary (eventAgeSeconds === window)", async () => {
		const edgeEvent = makeStripeEvent({
			created: NOW_SECONDS - ANTI_REPLAY_WINDOW_SECONDS, // exactly 300s old
		});
		mockConstructEvent.mockReturnValue(edgeEvent);

		const req = makeRequest();
		const response = await POST(req);

		// eventAgeSeconds === window is NOT > window, so should proceed
		expect(response.status).toBe(200);
	});

	it("should not check idempotency when event is too old", async () => {
		const oldEvent = makeStripeEvent({ created: NOW_SECONDS - 400 });
		mockConstructEvent.mockReturnValue(oldEvent);

		const req = makeRequest();
		await POST(req);

		expect(mockPrisma.webhookEvent.findUnique).not.toHaveBeenCalled();
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
			select: { id: true, status: true },
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

	it("should continue processing when event status is PROCESSING (retry eligible)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			id: "wh_1",
			status: WebhookEventStatus.PROCESSING,
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
		expect(response.status).toBe(200);
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
			},
			update: {
				attempts: { increment: 1 },
				status: WebhookEventStatus.PROCESSING,
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
	it("should schedule post-webhook tasks via after() when tasks are present", async () => {
		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL", data: { orderId: "order-1" } },
			{ type: "ADMIN_NEW_ORDER_EMAIL", data: { orderId: "order-1" } },
		];
		mockDispatchEvent.mockResolvedValue({ success: true, tasks });

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).toHaveBeenCalledOnce();
		expect(mockExecutePostWebhookTasks).toHaveBeenCalledWith(tasks);
	});

	it("should NOT call after() when tasks array is empty", async () => {
		mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).not.toHaveBeenCalled();
		expect(mockExecutePostWebhookTasks).not.toHaveBeenCalled();
	});

	it("should NOT call after() when result is null (no tasks)", async () => {
		mockDispatchEvent.mockResolvedValue(null);

		const req = makeRequest();
		await POST(req);

		expect(mockAfter).not.toHaveBeenCalled();
		expect(mockExecutePostWebhookTasks).not.toHaveBeenCalled();
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
		// MAX_WEBHOOK_RETRY_ATTEMPTS = 3, so alert triggers when attempts >= 2
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
		// MAX_WEBHOOK_RETRY_ATTEMPTS = 3, so NO alert when attempts < 2
		mockDispatchEvent.mockRejectedValue(new Error("First failure"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_no_alert", attempts: 0 }),
		);

		const req = makeRequest();
		await POST(req);

		expect(mockSendWebhookFailedAlert).not.toHaveBeenCalled();
	});

	it("should NOT send admin alert when attempts is 1 (below threshold)", async () => {
		mockDispatchEvent.mockRejectedValue(new Error("Second failure"));
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh_no_alert_2", attempts: 1 }),
		);

		const req = makeRequest();
		await POST(req);

		expect(mockSendWebhookFailedAlert).not.toHaveBeenCalled();
	});

	it("should still mark event as FAILED even when alert is sent", async () => {
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
		mockPrisma.webhookEvent.update.mockImplementation(async () => {
			callOrder.push("update");
			return {};
		});
		mockAfter.mockImplementation((fn: () => Promise<void>) => {
			callOrder.push("after");
			return fn();
		});
		mockExecutePostWebhookTasks.mockImplementation(async () => {
			callOrder.push("executePostWebhookTasks");
			return { successful: 1, failed: 0, errors: [] };
		});

		const req = makeRequest();
		const response = await POST(req);

		expect(callOrder).toEqual([
			"findUnique",
			"upsert",
			"dispatchEvent",
			"update",
			"after",
			"executePostWebhookTasks",
		]);
		expect(response.status).toBe(200);
	});
});
