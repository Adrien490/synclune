import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockInitializePayment, mockUpdatePaymentAmount, mockCancelOrphanPI } = vi.hoisted(() => ({
	mockInitializePayment: vi.fn(),
	mockUpdatePaymentAmount: vi.fn(),
	mockCancelOrphanPI: vi.fn(),
}));

vi.mock("@/modules/payments/actions/initialize-payment", () => ({
	initializePayment: mockInitializePayment,
}));

vi.mock("@/modules/payments/actions/update-payment-amount", () => ({
	updatePaymentAmount: mockUpdatePaymentAmount,
}));

vi.mock("@/modules/payments/actions/cancel-orphan-payment-intent", () => ({
	cancelOrphanPaymentIntent: mockCancelOrphanPI,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { usePaymentIntent } from "../use-payment-intent";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS_INIT = {
	success: true as const,
	clientSecret: "pi_secret_123",
	paymentIntentId: "pi_123",
	subtotal: 10000,
	shipping: 500,
	total: 10500,
};

const ERROR_INIT = {
	success: false as const,
	error: "Erreur initialisation",
};

const CART_ITEMS = [{ skuId: "sku-1", quantity: 1, priceAtAdd: 10000 }];

afterEach(cleanup);

// ============================================================================
// usePaymentIntent
// ============================================================================

describe("usePaymentIntent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInitializePayment.mockResolvedValue(SUCCESS_INIT);
		mockUpdatePaymentAmount.mockResolvedValue({
			success: true,
			shipping: 800,
			newTotal: 10800,
		});
	});

	it("starts with isLoading=true and null clientSecret", () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		expect(result.current.isLoading).toBe(true);
		expect(result.current.clientSecret).toBeNull();
		expect(result.current.paymentIntentId).toBeNull();
		expect(result.current.error).toBeNull();
	});

	it("sets state from successful initializePayment response", async () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.clientSecret).toBe("pi_secret_123");
		expect(result.current.paymentIntentId).toBe("pi_123");
		expect(result.current.subtotal).toBe(10000);
		expect(result.current.shipping).toBe(500);
		expect(result.current.total).toBe(10500);
		expect(result.current.error).toBeNull();
	});

	it("sets error state when initializePayment fails", async () => {
		mockInitializePayment.mockResolvedValue(ERROR_INIT);

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).toBe("Erreur initialisation");
		expect(result.current.clientSecret).toBeNull();
	});

	it("calls initializePayment with cartItems and email on mount", async () => {
		const { result } = renderHook(() =>
			usePaymentIntent({ cartItems: CART_ITEMS, email: "test@example.com" }),
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(mockInitializePayment).toHaveBeenCalledWith({
			cartItems: CART_ITEMS,
			email: "test@example.com",
		});
	});

	it("only calls initializePayment once on mount", async () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(mockInitializePayment).toHaveBeenCalledTimes(1);
	});

	it("exposes updateAmount function", async () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(typeof result.current.updateAmount).toBe("function");
	});

	it("updateAmount does nothing when paymentIntentId is null", () => {
		mockInitializePayment.mockResolvedValue(ERROR_INIT);
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		// Before initialization completes, paymentIntentId is null
		act(() => {
			result.current.updateAmount("FR", "75001", 0);
		});

		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();
	});

	it("updateAmount calls updatePaymentAmount with debounce after init", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		// Wait for init (flush the mock promise resolution)
		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", 500);
		});

		// Before debounce fires - not called yet
		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();

		// Advance past 500ms debounce
		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		expect(mockUpdatePaymentAmount).toHaveBeenCalledWith({
			paymentIntentId: "pi_123",
			subtotal: 10000,
			country: "FR",
			postalCode: "75001",
			discountAmount: 500,
		});

		vi.useRealTimers();
	});

	it("updateAmount debounces multiple rapid calls", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", 0);
			result.current.updateAmount("FR", "75001", 100);
			result.current.updateAmount("FR", "75001", 200);
		});

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		// Only the last call should fire
		expect(mockUpdatePaymentAmount).toHaveBeenCalledTimes(1);
		expect(mockUpdatePaymentAmount).toHaveBeenCalledWith(
			expect.objectContaining({ discountAmount: 200 }),
		);

		vi.useRealTimers();
	});

	it("updates shipping and total after successful updateAmount", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", 0);
		});

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(result.current.shipping).toBe(800);
		expect(result.current.total).toBe(10800);

		vi.useRealTimers();
	});

	// ─── Visibility change (stale tab re-activation) ──────────────────────────

	it("does not re-initialize when tab was hidden less than 10 minutes", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.paymentIntentId).toBe("pi_123");
		mockInitializePayment.mockClear();

		// Simulate hiding tab
		Object.defineProperty(document, "hidden", { value: true, writable: true });
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Advance 5 minutes (below threshold)
		vi.advanceTimersByTime(5 * 60 * 1000);

		// Simulate showing tab
		Object.defineProperty(document, "hidden", { value: false, writable: true });
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		expect(mockInitializePayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("re-initializes when tab was hidden more than 10 minutes", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.paymentIntentId).toBe("pi_123");
		mockInitializePayment.mockClear();

		const refreshedResult = {
			success: true as const,
			clientSecret: "pi_secret_456",
			paymentIntentId: "pi_456",
			subtotal: 10000,
			shipping: 600,
			total: 10600,
		};
		mockInitializePayment.mockResolvedValue(refreshedResult);

		// Simulate hiding tab
		Object.defineProperty(document, "hidden", { value: true, writable: true });
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Advance 11 minutes (above threshold)
		vi.advanceTimersByTime(11 * 60 * 1000);

		// Simulate showing tab
		Object.defineProperty(document, "hidden", { value: false, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
		});

		expect(mockInitializePayment).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("does not re-initialize when paymentIntentId is null (init failed)", async () => {
		vi.useFakeTimers();

		mockInitializePayment.mockResolvedValue(ERROR_INIT);

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.paymentIntentId).toBeNull();
		mockInitializePayment.mockClear();

		// Simulate hiding + showing tab after 11 minutes
		Object.defineProperty(document, "hidden", { value: true, writable: true });
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		vi.advanceTimersByTime(11 * 60 * 1000);

		Object.defineProperty(document, "hidden", { value: false, writable: true });
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Should not re-initialize since there's no paymentIntentId
		expect(mockInitializePayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});
});
