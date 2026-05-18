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
	mockExecutePostWebhookTasks,
	mockSendWebhookFailedAlert,
	ANTI_REPLAY_WINDOW_SECONDS,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
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
				upsert: vi.fn(),
				update: vi.fn(),
			},
		},
		mockNextResponseJson: nextResponseJson,
		mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
		mockHeaders: vi.fn(),
		mockDispatchEvent: vi.fn(),
		mockIsEventSupported: vi.fn(),
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
vi.mock("@/modules/webhooks/utils/execute-post-tasks", () => ({
	executePostWebhookTasks: mockExecutePostWebhookTasks,
}));
vi.mock("@/modules/webhooks/services/alert.service", () => ({
	sendWebhookFailedAlert: mockSendWebhookFailedAlert,
}));
vi.mock("@/modules/webhooks/constants/webhook.constants", () => ({
	ANTI_REPLAY_WINDOW_SECONDS,
	MAX_WEBHOOK_RETRY_ATTEMPTS,
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
		type: "checkout.session.completed",
		created: NOW_SECONDS - 10,
		data: { object: {} },
		...overrides,
	};
}

function makeWebhookRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "wh-1",
		eventId: "evt_test_concurrent_1",
		eventType: "checkout.session.completed",
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
		mockPrisma.webhookEvent.upsert.mockResolvedValue(makeWebhookRecord());
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		mockIsEventSupported.mockReturnValue(true);
		mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });
		mockAfter.mockImplementation((fn: () => Promise<void>) => fn());
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

		expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
		expect(result.status).toBe(200);
	});

	it("should skip PROCESSING events (concurrent webhook protection)", async () => {
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(
			makeWebhookRecord({ status: "PROCESSING", attempts: 1 }),
		);

		const result = await POST(makeRequest());

		expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
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
		mockPrisma.webhookEvent.upsert.mockRejectedValue(
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
		mockPrisma.webhookEvent.upsert.mockRejectedValue(
			new PrismaClientKnownRequestError("Connection lost", { code: "P1001" }),
		);

		const result = await POST(makeRequest());

		expect(result.status).toBe(500);
	});

	it("should skip dispatch when concurrent upsert race detected (existingEvent=null but attempts>=1)", async () => {
		// Race scenario: thread A and B both see findUnique=null at the same time.
		// Thread B then upserts AFTER thread A — Prisma's upsert hits the update branch
		// (attempts incremented to 1). Route should skip dispatch to avoid double-processing.
		mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
		mockPrisma.webhookEvent.upsert.mockResolvedValue(
			makeWebhookRecord({ id: "wh-race", status: "PROCESSING", attempts: 1 }),
		);

		const result = await POST(makeRequest());

		expect(result.status).toBe(200);
		expect(mockNextResponseJson).toHaveBeenCalledWith({
			received: true,
			status: "duplicate",
		});
		expect(mockDispatchEvent).not.toHaveBeenCalled();
	});
});
