import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockInitializePayment,
	mockUpdatePaymentAmount,
	mockCancelOrphanPI,
	mockValidateCart,
	mockRouterRefresh,
} = vi.hoisted(() => ({
	mockInitializePayment: vi.fn(),
	mockUpdatePaymentAmount: vi.fn(),
	mockCancelOrphanPI: vi.fn(),
	mockValidateCart: vi.fn().mockResolvedValue({ isValid: true, issues: [] }),
	mockRouterRefresh: vi.fn(),
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

vi.mock("@/modules/cart/actions/validate-cart", () => ({
	validateCart: mockValidateCart,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRouterRefresh, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { usePaymentIntent } from "../use-payment-intent";

// ============================================================================
// Fixtures
// ============================================================================

const SUCCESS_INIT = {
	success: true as const,
	clientSecret: "pi_secret_123",
	paymentIntentId: "pi_123",
	subtotal: 10000,
	shipping: 500,
	total: 10500,
};

const SUCCESS_INIT_NEW_PI = {
	success: true as const,
	clientSecret: "pi_secret_456",
	paymentIntentId: "pi_456",
	subtotal: 10000,
	shipping: 600,
	total: 10600,
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
		// Reset document.hidden to visible
		Object.defineProperty(document, "hidden", { value: false, writable: true });
		mockInitializePayment.mockResolvedValue(SUCCESS_INIT);
		mockUpdatePaymentAmount.mockResolvedValue({
			success: true,
			shipping: 800,
			newTotal: 10800,
		});
		mockCancelOrphanPI.mockResolvedValue(undefined);
	});

	// --------------------------------------------------------------------------
	// Initial state
	// --------------------------------------------------------------------------

	it("starts with isLoading=true and null clientSecret", () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		expect(result.current.isLoading).toBe(true);
		expect(result.current.clientSecret).toBeNull();
		expect(result.current.paymentIntentId).toBeNull();
		expect(result.current.error).toBeNull();
	});

	it("starts with subtotal, shipping and total at 0", () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		expect(result.current.subtotal).toBe(0);
		expect(result.current.shipping).toBe(0);
		expect(result.current.total).toBe(0);
	});

	// --------------------------------------------------------------------------
	// Successful initialization
	// --------------------------------------------------------------------------

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

	it("calls initializePayment without email when email is omitted", async () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(mockInitializePayment).toHaveBeenCalledWith({
			cartItems: CART_ITEMS,
			email: undefined,
		});
	});

	it("only calls initializePayment once on mount", async () => {
		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(mockInitializePayment).toHaveBeenCalledTimes(1);
	});

	// --------------------------------------------------------------------------
	// Initialization error
	// --------------------------------------------------------------------------

	it("sets error state when initializePayment fails", async () => {
		mockInitializePayment.mockResolvedValue(ERROR_INIT);

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).toBe("Erreur initialisation");
		expect(result.current.clientSecret).toBeNull();
		expect(result.current.paymentIntentId).toBeNull();
	});

	it("keeps clientSecret null when initializePayment fails", async () => {
		mockInitializePayment.mockResolvedValue(ERROR_INIT);

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.clientSecret).toBeNull();
	});

	// --------------------------------------------------------------------------
	// updateAmount — exposed function
	// --------------------------------------------------------------------------

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
			result.current.updateAmount("FR", "75001", null);
		});

		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// updateAmount — debounce behavior
	// --------------------------------------------------------------------------

	it("updateAmount calls updatePaymentAmount after 500ms debounce", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", "WELCOME10");
		});

		// Not called yet — debounce pending
		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		// Subtotal AND discount are recomputed server-side (audits P0.1 + F1) —
		// the client only passes the applied promo code.
		expect(mockUpdatePaymentAmount).toHaveBeenCalledWith({
			paymentIntentId: "pi_123",
			country: "FR",
			postalCode: "75001",
			discountCode: "WELCOME10",
		});

		vi.useRealTimers();
	});

	it("updateAmount debounces multiple rapid calls — only last fires", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", null);
			result.current.updateAmount("FR", "75001", "CODE1");
			result.current.updateAmount("FR", "75001", "CODE2");
		});

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		expect(mockUpdatePaymentAmount).toHaveBeenCalledTimes(1);
		expect(mockUpdatePaymentAmount).toHaveBeenCalledWith(
			expect.objectContaining({ discountCode: "CODE2" }),
		);

		vi.useRealTimers();
	});

	it("updateAmount does not fire before 500ms", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", null);
		});

		act(() => {
			vi.advanceTimersByTime(499);
		});

		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// --------------------------------------------------------------------------
	// updateAmount — success state update
	// --------------------------------------------------------------------------

	it("updates shipping and total after successful updateAmount", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", null);
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

	// --------------------------------------------------------------------------
	// updateAmount — failure branch
	// --------------------------------------------------------------------------

	it("does not update state when updatePaymentAmount returns success=false", async () => {
		vi.useFakeTimers();

		mockUpdatePaymentAmount.mockResolvedValue({ success: false });

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		// Capture the initial values after init
		const initialShipping = result.current.shipping;
		const initialTotal = result.current.total;

		act(() => {
			result.current.updateAmount("FR", "75001", null);
		});

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
			await Promise.resolve();
		});

		// State should remain unchanged when action fails
		expect(result.current.shipping).toBe(initialShipping);
		expect(result.current.total).toBe(initialTotal);

		vi.useRealTimers();
	});

	// --------------------------------------------------------------------------
	// Visibility change — stale tab re-activation
	// --------------------------------------------------------------------------

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

		mockInitializePayment.mockResolvedValue(SUCCESS_INIT_NEW_PI);

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

	it("updates state with new PI values after stale re-initialization", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		mockInitializePayment.mockClear();
		mockInitializePayment.mockResolvedValue(SUCCESS_INIT_NEW_PI);

		Object.defineProperty(document, "hidden", { value: true, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		vi.advanceTimersByTime(11 * 60 * 1000);

		Object.defineProperty(document, "hidden", { value: false, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(result.current.clientSecret).toBe("pi_secret_456");
		expect(result.current.paymentIntentId).toBe("pi_456");
		expect(result.current.shipping).toBe(600);
		expect(result.current.total).toBe(10600);

		vi.useRealTimers();
	});

	it("cancels orphan PI when re-init produces a different paymentIntentId", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.paymentIntentId).toBe("pi_123");
		mockInitializePayment.mockClear();
		mockInitializePayment.mockResolvedValue(SUCCESS_INIT_NEW_PI); // Different PI ID

		Object.defineProperty(document, "hidden", { value: true, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		vi.advanceTimersByTime(11 * 60 * 1000);

		Object.defineProperty(document, "hidden", { value: false, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
			await Promise.resolve();
		});

		// Old PI should be cancelled because a new one was created
		expect(mockCancelOrphanPI).toHaveBeenCalledWith("pi_123");

		vi.useRealTimers();
	});

	it("does not cancel orphan PI when re-init returns the same paymentIntentId", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		mockInitializePayment.mockClear();
		// Same PI ID as initial
		mockInitializePayment.mockResolvedValue(SUCCESS_INIT);

		Object.defineProperty(document, "hidden", { value: true, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		vi.advanceTimersByTime(11 * 60 * 1000);

		Object.defineProperty(document, "hidden", { value: false, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(mockCancelOrphanPI).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("sets error state when re-initialization after stale tab fails", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		mockInitializePayment.mockClear();
		mockInitializePayment.mockResolvedValue(ERROR_INIT);

		Object.defineProperty(document, "hidden", { value: true, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		vi.advanceTimersByTime(11 * 60 * 1000);

		Object.defineProperty(document, "hidden", { value: false, writable: true });
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(result.current.error).toBe("Erreur initialisation");
		expect(result.current.isLoading).toBe(false);

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

	// --------------------------------------------------------------------------
	// Debounce cleanup on unmount
	// --------------------------------------------------------------------------

	it("clears debounce timer on unmount to avoid state updates on dead component", async () => {
		vi.useFakeTimers();

		const { result, unmount } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", null);
		});

		// Unmount before debounce fires
		unmount();

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		// updatePaymentAmount should not have been called after unmount
		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// --------------------------------------------------------------------------
	// cancelPendingUpdate — F5 (audit checkout Stripe Elements 2026-07-30)
	// --------------------------------------------------------------------------

	it("cancelPendingUpdate empêche un appel programmé de partir après la liaison de la commande", async () => {
		// Scénario : correction du code postal, puis clic sur Payer dans les 500 ms. Une
		// fois la commande liée au PI, le serveur refuse l'update (`metadata.orderId`) et
		// l'appel n'aurait produit qu'une Alert « Commande déjà initiée — actualise la
		// page » affichée pendant l'ouverture de la fenêtre 3D Secure.
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.updateAmount("FR", "75001", null);
		});

		act(() => {
			result.current.cancelPendingUpdate();
		});

		await act(async () => {
			vi.advanceTimersByTime(500);
			await Promise.resolve();
		});

		expect(mockUpdatePaymentAmount).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("cancelPendingUpdate est sans effet quand aucun update n'est en attente", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => usePaymentIntent({ cartItems: CART_ITEMS }));

		await act(async () => {
			await Promise.resolve();
		});

		expect(() => {
			act(() => {
				result.current.cancelPendingUpdate();
				result.current.cancelPendingUpdate();
			});
		}).not.toThrow();

		vi.useRealTimers();
	});
});
