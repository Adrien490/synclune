import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockDispatchEvent,
	mockIsEventSupported,
	mockExecutePostWebhookTasks,
	mockSentryStartSpan,
	mockSentryWithScope,
	mockSentryCaptureException,
} = vi.hoisted(() => ({
	mockPrisma: {
		webhookEvent: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
	},
	mockStripe: { events: { retrieve: vi.fn() } },
	mockGetStripeClient: vi.fn(),
	mockDispatchEvent: vi.fn(),
	mockIsEventSupported: vi.fn(() => true),
	mockExecutePostWebhookTasks: vi.fn(),
	mockSentryStartSpan: vi.fn(async (_opts: unknown, cb: () => unknown) => cb()),
	mockSentryWithScope: vi.fn((cb: (scope: unknown) => void) =>
		cb({ setTag: vi.fn(), setLevel: vi.fn(), setFingerprint: vi.fn(), setContext: vi.fn() }),
	),
	mockSentryCaptureException: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

vi.mock("@/modules/webhooks/utils/event-registry", () => ({
	dispatchEvent: mockDispatchEvent,
	isEventSupported: mockIsEventSupported,
}));

vi.mock("@/modules/webhooks/utils/execute-post-tasks", () => ({
	executePostWebhookTasks: mockExecutePostWebhookTasks,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: mockSentryStartSpan,
	withScope: mockSentryWithScope,
	captureException: mockSentryCaptureException,
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
import { Prisma } from "@/app/generated/prisma/client";

describe("retryFailedWebhooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		mockIsEventSupported.mockReturnValue(true);
	});

	it("returns skipped result with STRIPE_KEY_MISSING reason when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await retryFailedWebhooks();

		expect(result).toEqual({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		});
	});

	it("flips stale PROCESSING events back to FAILED before retrying", async () => {
		await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalledWith({
			where: expect.objectContaining({
				status: "PROCESSING",
				processedAt: expect.objectContaining({ lt: expect.any(Date) }),
			}),
			data: { status: "FAILED" },
		});
	});

	it("returns zero counts when no FAILED events are eligible", async () => {
		const result = await retryFailedWebhooks();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0 });
	});

	it("retries a FAILED event, dispatches it and marks it COMPLETED", async () => {
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce([
			{
				id: "wh-1",
				stripeEventId: "evt_1",
				eventType: "payment_intent.succeeded",
				attempts: 1,
			},
		]);
		mockStripe.events.retrieve.mockResolvedValueOnce({
			id: "evt_1",
			type: "payment_intent.succeeded",
		});
		mockDispatchEvent.mockResolvedValueOnce({ skipped: false });

		const result = await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.update).toHaveBeenNthCalledWith(1, {
			where: { id: "wh-1", status: "FAILED", attempts: 1 },
			data: {
				status: "PROCESSING",
				attempts: { increment: 1 },
			},
		});
		expect(mockDispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({ id: "evt_1", type: "payment_intent.succeeded" }),
		);
		expect(mockPrisma.webhookEvent.update).toHaveBeenLastCalledWith({
			where: { id: "wh-1" },
			data: expect.objectContaining({
				status: "COMPLETED",
				errorMessage: null,
			}),
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
	});

	it("skips events whose type is no longer supported", async () => {
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce([
			{ id: "wh-2", stripeEventId: "evt_2", eventType: "obsolete.event", attempts: 0 },
		]);
		mockStripe.events.retrieve.mockResolvedValueOnce({
			id: "evt_2",
			type: "obsolete.event",
		});
		mockIsEventSupported.mockReturnValueOnce(false);

		const result = await retryFailedWebhooks();

		expect(mockDispatchEvent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("skips when another worker already locked the row (P2025 race)", async () => {
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce([
			{ id: "wh-3", stripeEventId: "evt_3", eventType: "x", attempts: 1 },
		]);
		// Build a P2025 error matching the mocked Prisma class (see vi.mock @ top of file).
		const RaceCtor = Prisma.PrismaClientKnownRequestError as unknown as new (
			message: string,
			code: string,
		) => Error;
		const raceError = new RaceCtor("Race", "P2025");
		mockPrisma.webhookEvent.update.mockRejectedValueOnce(raceError);

		const result = await retryFailedWebhooks();

		expect(mockStripe.events.retrieve).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("marks the event FAILED and captures Sentry when dispatch throws", async () => {
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce([
			{
				id: "wh-4",
				stripeEventId: "evt_4",
				eventType: "payment_intent.failed",
				attempts: 0,
			},
		]);
		mockStripe.events.retrieve.mockResolvedValueOnce({
			id: "evt_4",
			type: "payment_intent.failed",
		});
		mockDispatchEvent.mockRejectedValueOnce(new Error("handler exploded"));

		const result = await retryFailedWebhooks();

		expect(mockSentryCaptureException).toHaveBeenCalled();
		expect(mockPrisma.webhookEvent.update).toHaveBeenLastCalledWith({
			where: { id: "wh-4" },
			data: expect.objectContaining({
				status: "FAILED",
				errorMessage: "handler exploded",
			}),
		});
		expect(result).toMatchObject({ processed: 0, errored: 1, skipped: 0 });
	});

	it("hasMore: true when batch is full (BATCH_SIZE_MEDIUM=25)", async () => {
		const batch = Array.from({ length: 25 }, (_, i) => ({
			id: `wh-${i}`,
			stripeEventId: `evt_${i}`,
			eventType: "x",
			attempts: 0,
		}));
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce(batch);
		mockStripe.events.retrieve.mockResolvedValue({ id: "evt", type: "x" });
		mockDispatchEvent.mockResolvedValue({ skipped: false });

		const result = await retryFailedWebhooks();

		expect(result.hasMore).toBe(true);
	});

	it("breaks the loop early when the BATCH_DEADLINE_MS deadline is exceeded mid-batch", async () => {
		const batch = Array.from({ length: 3 }, (_, i) => ({
			id: `wh-${i}`,
			stripeEventId: `evt_${i}`,
			eventType: "payment_intent.succeeded",
			attempts: 0,
		}));
		mockPrisma.webhookEvent.findMany.mockResolvedValueOnce(batch);
		mockStripe.events.retrieve.mockResolvedValue({
			id: "evt",
			type: "payment_intent.succeeded",
		});
		mockDispatchEvent.mockResolvedValue({ skipped: false });

		// Date.now() climbs ~30s per call → after iter 1 the deadline (initialAt + 45s)
		// is already in the past, so iter 2 should break before any work.
		let virtualNow = 1_700_000_000_000;
		const spy = vi.spyOn(Date, "now").mockImplementation(() => {
			const t = virtualNow;
			virtualNow += 30_000;
			return t;
		});

		try {
			const result = await retryFailedWebhooks();

			expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
			expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
		} finally {
			spy.mockRestore();
		}
	});
});
