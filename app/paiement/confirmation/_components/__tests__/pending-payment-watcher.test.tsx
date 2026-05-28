import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRouterRefresh, mockRouterReplace, mockUseRouter, mockFetch } = vi.hoisted(() => ({
	mockRouterRefresh: vi.fn(),
	mockRouterReplace: vi.fn(),
	mockUseRouter: vi.fn(),
	mockFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

import { PendingPaymentWatcher } from "../pending-payment-watcher";

beforeEach(() => {
	vi.clearAllMocks();
	mockUseRouter.mockReturnValue({ refresh: mockRouterRefresh, replace: mockRouterReplace });

	(globalThis as any).fetch = mockFetch;
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		configurable: true,
	});
});

afterEach(() => {
	cleanup();
});

const ORDER_ID = "kjlqzsfgwerthnvbcxmaqwer";
const ORDER_NUMBER = "SYN-2026-0042";

function setupFetch(payload: { paymentStatus: string; status: string }) {
	mockFetch.mockResolvedValue({
		ok: true,
		json: vi.fn().mockResolvedValue(payload),
	} as unknown as Response);
}

describe("PendingPaymentWatcher", () => {
	it("renders nothing before first poll resolves", () => {
		setupFetch({ paymentStatus: "PENDING", status: "PENDING" });
		const { container } = render(
			<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("calls router.refresh() when polling detects PAID", async () => {
		setupFetch({ paymentStatus: "PAID", status: "PROCESSING" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockRouterRefresh).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(mockRouterReplace).not.toHaveBeenCalled();
	});

	it("redirects to /paiement/annulation when polling detects FAILED", async () => {
		setupFetch({ paymentStatus: "FAILED", status: "CANCELLED" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(mockRouterReplace.mock.calls[0]?.[0]).toContain("/paiement/annulation");
		expect(mockRouterReplace.mock.calls[0]?.[0]).toContain("reason=payment_failed");
	});

	it("calls fetch with the correct status endpoint URL", async () => {
		setupFetch({ paymentStatus: "PAID", status: "PROCESSING" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockFetch).toHaveBeenCalled(), { timeout: 5000 });
		expect(mockFetch.mock.calls[0]?.[0]).toBe(
			`/api/orders/${ORDER_NUMBER}/status?orderId=${ORDER_ID}`,
		);
	});
});
