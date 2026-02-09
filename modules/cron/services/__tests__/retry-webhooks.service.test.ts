import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const {
	mockPrisma,
	mockGetStripeClient,
	mockStripe,
	mockDispatchEvent,
	mockIsEventSupported,
	mockExecutePostWebhookTasks,
} = vi.hoisted(() => ({
	mockPrisma: {
		webhookEvent: {
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			findUnique: vi.fn(),
		},
	},
	mockStripe: {
		events: { retrieve: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockDispatchEvent: vi.fn(),
	mockIsEventSupported: vi.fn(),
	mockExecutePostWebhookTasks: vi.fn(),
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

import { retryFailedWebhooks } from "../retry-webhooks.service";

describe("retryFailedWebhooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
	});

	it("should return null when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await retryFailedWebhooks();

		expect(result).toBeNull();
	});

	it("should recover orphaned PROCESSING events first", async () => {
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);

		await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalledTimes(2);

		const firstCall = mockPrisma.webhookEvent.updateMany.mock.calls[0][0];
		expect(firstCall.where.status).toBe("PROCESSING");
		expect(firstCall.data.status).toBe("FAILED");
		expect(firstCall.data.errorMessage).toContain("orphaned");
	});

	it("should return zero counts when no failed events exist", async () => {
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);

		const result = await retryFailedWebhooks();

		expect(result).toEqual({
			found: 0,
			retried: 0,
			succeeded: 0,
			permanentlyFailed: 0,
			errors: 0,
			orphansRecovered: 0,
		});
	});

	it("should skip unsupported event types", async () => {
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([
			{
				id: "evt-1",
				stripeEventId: "evt_stripe_1",
				eventType: "unsupported.event",
				attempts: 1,
			},
		]);
		mockIsEventSupported.mockReturnValue(false);
		mockPrisma.webhookEvent.update.mockResolvedValue({});

		const result = await retryFailedWebhooks();

		expect(mockIsEventSupported).toHaveBeenCalledWith("unsupported.event");
		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "evt-1" },
			data: { status: "SKIPPED" },
		});
		expect(result!.retried).toBe(0);
	});

	it("should skip events not found in Stripe (expired)", async () => {
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([
			{
				id: "evt-2",
				stripeEventId: "evt_stripe_expired",
				eventType: "payment_intent.succeeded",
				attempts: 1,
			},
		]);
		mockIsEventSupported.mockReturnValue(true);
		mockStripe.events.retrieve.mockRejectedValue(new Error("Not found"));
		mockPrisma.webhookEvent.update.mockResolvedValue({});

		const result = await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "evt-2" },
			data: {
				status: "SKIPPED",
				errorMessage: "Event not found in Stripe (expired)",
			},
		});
		expect(result!.retried).toBe(0);
	});

	it("should successfully retry a failed event", async () => {
		const mockEvent = {
			id: "evt-3",
			stripeEventId: "evt_stripe_success",
			eventType: "payment_intent.succeeded",
			attempts: 1,
		};
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([mockEvent]);
		mockIsEventSupported.mockReturnValue(true);

		const stripeEvent = { id: "evt_stripe_success", type: "payment_intent.succeeded" } as Stripe.Event;
		mockStripe.events.retrieve.mockResolvedValue(stripeEvent);
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		mockDispatchEvent.mockResolvedValue({ tasks: [] });

		const result = await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "evt-3" },
			data: {
				status: "PROCESSING",
				attempts: { increment: 1 },
			},
		});

		expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
			where: { id: "evt-3" },
			data: {
				status: "COMPLETED",
				processedAt: expect.any(Date),
				errorMessage: null,
			},
		});

		expect(result!.retried).toBe(1);
		expect(result!.succeeded).toBe(1);
	});

	it("should execute post-webhook tasks on success", async () => {
		const mockEvent = {
			id: "evt-4",
			stripeEventId: "evt_stripe_tasks",
			eventType: "payment_intent.succeeded",
			attempts: 0,
		};
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([mockEvent]);
		mockIsEventSupported.mockReturnValue(true);
		mockStripe.events.retrieve.mockResolvedValue({} as Stripe.Event);
		mockPrisma.webhookEvent.update.mockResolvedValue({});
		const mockTasks = [{ type: "send-email", data: {} }];
		mockDispatchEvent.mockResolvedValue({ tasks: mockTasks });

		await retryFailedWebhooks();

		expect(mockExecutePostWebhookTasks).toHaveBeenCalledWith(mockTasks);
	});

	it("should mark event as permanently failed after max attempts", async () => {
		const mockEvent = {
			id: "evt-5",
			stripeEventId: "evt_stripe_perm_fail",
			eventType: "payment_intent.succeeded",
			attempts: 2,
		};
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([mockEvent]);
		mockIsEventSupported.mockReturnValue(true);
		mockStripe.events.retrieve.mockResolvedValue({} as Stripe.Event);
		mockPrisma.webhookEvent.update.mockResolvedValueOnce({});
		mockDispatchEvent.mockRejectedValue(new Error("Handler crashed"));
		mockPrisma.webhookEvent.findUnique.mockResolvedValue({
			attempts: 3,
			status: "PROCESSING",
		});
		mockPrisma.webhookEvent.update.mockResolvedValueOnce({});

		const result = await retryFailedWebhooks();

		expect(result!.permanentlyFailed).toBe(1);
		expect(result!.errors).toBe(0);
	});

	it("should query only FAILED events with attempts below max", async () => {
		mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.webhookEvent.findMany.mockResolvedValue([]);

		await retryFailedWebhooks();

		expect(mockPrisma.webhookEvent.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: "FAILED",
					attempts: { lt: 3 },
				}),
				orderBy: { receivedAt: "asc" },
				take: 10,
			})
		);
	});
});
