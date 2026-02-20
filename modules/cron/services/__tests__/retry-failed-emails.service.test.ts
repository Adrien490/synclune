import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockSendShippingConfirmationEmail,
	mockSendDeliveryConfirmationEmail,
	mockSendReturnConfirmationEmail,
	mockSendOrderConfirmationEmail,
	mockSendRefundConfirmationEmail,
	mockSendPaymentFailedEmail,
} = vi.hoisted(() => ({
	mockPrisma: {
		failedEmail: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
	},
	mockSendShippingConfirmationEmail: vi.fn(),
	mockSendDeliveryConfirmationEmail: vi.fn(),
	mockSendReturnConfirmationEmail: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockSendRefundConfirmationEmail: vi.fn(),
	mockSendPaymentFailedEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/emails/services/order-emails", () => ({
	sendShippingConfirmationEmail: mockSendShippingConfirmationEmail,
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
	sendDeliveryConfirmationEmail: mockSendDeliveryConfirmationEmail,
}));

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendReturnConfirmationEmail: mockSendReturnConfirmationEmail,
}));

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));

vi.mock("@/modules/emails/services/payment-emails", () => ({
	sendPaymentFailedEmail: mockSendPaymentFailedEmail,
}));

import { retryFailedEmails } from "../retry-failed-emails.service";

describe("retryFailedEmails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-20T10:00:00Z"));
	});

	it("should return zero counts when no failed emails exist", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([]);

		const result = await retryFailedEmails();

		expect(result).toEqual({
			found: 0,
			retried: 0,
			exhausted: 0,
			errors: 0,
		});
	});

	it("should query PENDING emails with attempts below max", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([]);

		await retryFailedEmails();

		expect(mockPrisma.failedEmail.findMany).toHaveBeenCalledWith({
			where: {
				status: "PENDING",
				attempts: { lt: 3 },
			},
			orderBy: { createdAt: "asc" },
			take: 10,
		});
	});

	it("should successfully retry a shipping-confirmation email", async () => {
		const failedEmail = {
			id: "fe-1",
			to: "client@example.com",
			template: "shipping-confirmation",
			payload: { orderNumber: "CMD-001", customerName: "Alice" },
			attempts: 0,
		};
		mockPrisma.failedEmail.findMany.mockResolvedValue([failedEmail]);
		mockSendShippingConfirmationEmail.mockResolvedValue({});
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(mockSendShippingConfirmationEmail).toHaveBeenCalledWith({
			orderNumber: "CMD-001",
			customerName: "Alice",
			to: "client@example.com",
		});
		expect(mockPrisma.failedEmail.update).toHaveBeenCalledWith({
			where: { id: "fe-1" },
			data: { status: "RETRIED", attempts: 1 },
		});
		expect(result.retried).toBe(1);
	});

	it("should retry order-confirmation emails from webhook failures", async () => {
		const failedEmail = {
			id: "fe-2",
			to: "buyer@example.com",
			template: "order-confirmation",
			payload: { orderNumber: "CMD-002", customerName: "Bob" },
			attempts: 1,
		};
		mockPrisma.failedEmail.findMany.mockResolvedValue([failedEmail]);
		mockSendOrderConfirmationEmail.mockResolvedValue({});
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(mockSendOrderConfirmationEmail).toHaveBeenCalledWith({
			orderNumber: "CMD-002",
			customerName: "Bob",
			to: "buyer@example.com",
		});
		expect(result.retried).toBe(1);
	});

	it("should mark unknown templates as EXHAUSTED", async () => {
		const failedEmail = {
			id: "fe-3",
			to: "test@example.com",
			template: "unknown-template",
			payload: {},
			attempts: 0,
		};
		mockPrisma.failedEmail.findMany.mockResolvedValue([failedEmail]);
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(mockPrisma.failedEmail.update).toHaveBeenCalledWith({
			where: { id: "fe-3" },
			data: {
				status: "EXHAUSTED",
				lastError: "Unknown template: unknown-template",
				attempts: 1,
			},
		});
		expect(result.exhausted).toBe(1);
	});

	it("should mark email as EXHAUSTED after max retry attempts", async () => {
		const failedEmail = {
			id: "fe-4",
			to: "client@example.com",
			template: "delivery-confirmation",
			payload: { orderNumber: "CMD-003" },
			attempts: 2, // Will become 3 (max)
		};
		mockPrisma.failedEmail.findMany.mockResolvedValue([failedEmail]);
		mockSendDeliveryConfirmationEmail.mockRejectedValue(
			new Error("Resend API down")
		);
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(mockPrisma.failedEmail.update).toHaveBeenCalledWith({
			where: { id: "fe-4" },
			data: {
				status: "EXHAUSTED",
				attempts: 3,
				lastError: "Resend API down",
			},
		});
		expect(result.exhausted).toBe(1);
	});

	it("should keep email as PENDING on retry failure below max attempts", async () => {
		const failedEmail = {
			id: "fe-5",
			to: "client@example.com",
			template: "return-confirmation",
			payload: { orderNumber: "CMD-004" },
			attempts: 0,
		};
		mockPrisma.failedEmail.findMany.mockResolvedValue([failedEmail]);
		mockSendReturnConfirmationEmail.mockRejectedValue(
			new Error("Timeout")
		);
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(mockPrisma.failedEmail.update).toHaveBeenCalledWith({
			where: { id: "fe-5" },
			data: {
				status: "PENDING",
				attempts: 1,
				lastError: "Timeout",
			},
		});
		expect(result.errors).toBe(1);
	});

	it("should stop processing when deadline is exceeded", async () => {
		const emails = Array.from({ length: 5 }, (_, i) => ({
			id: `fe-${i}`,
			to: `user${i}@example.com`,
			template: "shipping-confirmation",
			payload: { orderNumber: `CMD-${i}` },
			attempts: 0,
		}));
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);
		mockPrisma.failedEmail.update.mockResolvedValue({});

		// First call succeeds, then advance time past deadline
		let callCount = 0;
		mockSendShippingConfirmationEmail.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) {
				// After first email, advance time past 50s deadline
				vi.advanceTimersByTime(51_000);
			}
		});

		const result = await retryFailedEmails();

		// Only the first email should have been processed
		expect(result.retried).toBe(1);
		expect(mockSendShippingConfirmationEmail).toHaveBeenCalledTimes(1);
	});

	it("should process multiple emails of different templates", async () => {
		const emails = [
			{
				id: "fe-a",
				to: "a@example.com",
				template: "shipping-confirmation",
				payload: { orderNumber: "CMD-A" },
				attempts: 0,
			},
			{
				id: "fe-b",
				to: "b@example.com",
				template: "refund-confirmation",
				payload: { orderNumber: "CMD-B" },
				attempts: 1,
			},
			{
				id: "fe-c",
				to: "c@example.com",
				template: "payment-failed",
				payload: { orderNumber: "CMD-C" },
				attempts: 0,
			},
		];
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);
		mockSendShippingConfirmationEmail.mockResolvedValue({});
		mockSendRefundConfirmationEmail.mockResolvedValue({});
		mockSendPaymentFailedEmail.mockResolvedValue({});
		mockPrisma.failedEmail.update.mockResolvedValue({});

		const result = await retryFailedEmails();

		expect(result.retried).toBe(3);
		expect(result.errors).toBe(0);
		expect(mockSendShippingConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mockSendPaymentFailedEmail).toHaveBeenCalledTimes(1);
	});
});
