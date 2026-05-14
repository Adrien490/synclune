import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStripeRetrieve, mockPrismaFindUnique, mockRedirect } = vi.hoisted(() => ({
	mockStripeRetrieve: vi.fn(),
	mockPrismaFindUnique: vi.fn(),
	mockRedirect: vi.fn((url: string) => {
		const err = new Error(`NEXT_REDIRECT:${url}`);
		(err as Error & { digest?: string }).digest = `NEXT_REDIRECT;${url}`;
		throw err;
	}),
}));

vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		checkout: { sessions: { retrieve: mockStripeRetrieve } },
	},
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findUnique: mockPrismaFindUnique } },
}));

import CheckoutReturnPage from "../page";

function callPage(sessionId: string | undefined) {
	return CheckoutReturnPage({
		searchParams: Promise.resolve(sessionId ? { session_id: sessionId } : {}),
	}).catch((e) => e as Error & { digest?: string });
}

describe("CheckoutReturnPage retry-poll", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	it("redirects to confirmation with order_id when Order is found on first try", async () => {
		mockStripeRetrieve.mockResolvedValue({ payment_status: "paid", status: "complete" });
		mockPrismaFindUnique.mockResolvedValueOnce({ id: "order-1", orderNumber: "SY-001" });

		const promise = callPage("cs_test_paid");
		await vi.runAllTimersAsync();
		await promise;

		expect(mockPrismaFindUnique).toHaveBeenCalledTimes(1);
		expect(mockRedirect).toHaveBeenCalledWith(
			"/paiement/confirmation?order_id=order-1&order_number=SY-001",
		);
	});

	it("retries up to 3 times when Order is initially missing then found", async () => {
		mockStripeRetrieve.mockResolvedValue({ payment_status: "paid", status: "complete" });
		mockPrismaFindUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: "order-2", orderNumber: "SY-002" });

		const promise = callPage("cs_test_late_webhook");
		await vi.runAllTimersAsync();
		await promise;

		expect(mockPrismaFindUnique).toHaveBeenCalledTimes(3);
		expect(mockRedirect).toHaveBeenCalledWith(
			"/paiement/confirmation?order_id=order-2&order_number=SY-002",
		);
	});

	it("falls back to pending=true after 3 failed attempts", async () => {
		mockStripeRetrieve.mockResolvedValue({ payment_status: "paid", status: "complete" });
		mockPrismaFindUnique.mockResolvedValue(null);

		const promise = callPage("cs_test_stuck");
		await vi.runAllTimersAsync();
		await promise;

		expect(mockPrismaFindUnique).toHaveBeenCalledTimes(3);
		expect(mockRedirect).toHaveBeenCalledWith(
			"/paiement/confirmation?session_id=cs_test_stuck&pending=true",
		);
	});

	it("redirects to annulation expired when session status is expired", async () => {
		mockStripeRetrieve.mockResolvedValue({ payment_status: "unpaid", status: "expired" });

		const promise = callPage("cs_test_expired");
		await vi.runAllTimersAsync();
		await promise;

		expect(mockPrismaFindUnique).not.toHaveBeenCalled();
		expect(mockRedirect).toHaveBeenCalledWith("/paiement/annulation?reason=expired");
	});

	it("redirects to home when session_id is missing", async () => {
		await callPage(undefined);
		expect(mockRedirect).toHaveBeenCalledWith("/");
	});
});
