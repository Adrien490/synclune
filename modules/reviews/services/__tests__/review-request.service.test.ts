import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSendReviewRequestEmailInternal } = vi.hoisted(() => ({
	mockSendReviewRequestEmailInternal: vi.fn(),
}));

vi.mock("../send-review-request-email.service", () => ({
	sendReviewRequestEmailInternal: mockSendReviewRequestEmailInternal,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import {
	scheduleReviewRequestEmail,
	scheduleReviewRequestEmailsBulk,
} from "../review-request.service";

// ============================================================================
// scheduleReviewRequestEmail
// ============================================================================

describe("scheduleReviewRequestEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should return success when email is sent", async () => {
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "Email envoyé",
		});

		const result = await scheduleReviewRequestEmail("order-1");

		expect(result.success).toBe(true);
		expect(result.message).toBe("Email envoyé");
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledWith("order-1");
	});

	it("should return failure when email service returns non-SUCCESS status", async () => {
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Order not found",
		});

		const result = await scheduleReviewRequestEmail("order-1");

		expect(result.success).toBe(false);
		expect(result.error).toBe("Order not found");
	});

	it("should return failure when email service returns NOT_FOUND", async () => {
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.NOT_FOUND,
			message: "Commande introuvable",
		});

		const result = await scheduleReviewRequestEmail("order-1");

		expect(result.success).toBe(false);
		expect(result.error).toBe("Commande introuvable");
	});

	it("should catch exceptions and return failure without throwing", async () => {
		mockSendReviewRequestEmailInternal.mockRejectedValue(new Error("Network error"));

		const result = await scheduleReviewRequestEmail("order-1");

		expect(result.success).toBe(false);
		expect(result.error).toBe("Network error");
	});

	it("should handle non-Error exceptions gracefully", async () => {
		mockSendReviewRequestEmailInternal.mockRejectedValue("string error");

		const result = await scheduleReviewRequestEmail("order-1");

		expect(result.success).toBe(false);
		expect(result.error).toBe("Unknown error");
	});
});

// ============================================================================
// scheduleReviewRequestEmailsBulk
// ============================================================================

describe("scheduleReviewRequestEmailsBulk", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should process all orders and count successes", async () => {
		mockSendReviewRequestEmailInternal.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "OK",
		});

		const result = await scheduleReviewRequestEmailsBulk(["order-1", "order-2", "order-3"]);

		expect(result.sent).toBe(3);
		expect(result.failed).toBe(0);
		expect(mockSendReviewRequestEmailInternal).toHaveBeenCalledTimes(3);
	});

	it("should count failures separately from successes", async () => {
		mockSendReviewRequestEmailInternal
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" })
			.mockResolvedValueOnce({ status: ActionStatus.ERROR, message: "fail" })
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" });

		const result = await scheduleReviewRequestEmailsBulk(["order-1", "order-2", "order-3"]);

		expect(result.sent).toBe(2);
		expect(result.failed).toBe(1);
	});

	it("should count exceptions as failures", async () => {
		mockSendReviewRequestEmailInternal
			.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "OK" })
			.mockRejectedValueOnce(new Error("crash"));

		const result = await scheduleReviewRequestEmailsBulk(["order-1", "order-2"]);

		expect(result.sent).toBe(1);
		expect(result.failed).toBe(1);
	});

	it("should return zero counts for empty array", async () => {
		const result = await scheduleReviewRequestEmailsBulk([]);

		expect(result.sent).toBe(0);
		expect(result.failed).toBe(0);
		expect(mockSendReviewRequestEmailInternal).not.toHaveBeenCalled();
	});

	it("should process orders sequentially (not in parallel)", async () => {
		const callOrder: string[] = [];

		mockSendReviewRequestEmailInternal.mockImplementation(async (orderId: string) => {
			callOrder.push(orderId);
			return { status: ActionStatus.SUCCESS, message: "OK" };
		});

		await scheduleReviewRequestEmailsBulk(["order-1", "order-2", "order-3"]);

		expect(callOrder).toEqual(["order-1", "order-2", "order-3"]);
	});
});
