"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { initializePayment } from "../actions/initialize-payment";
import { updatePaymentAmount } from "../actions/update-payment-amount";
import { cancelOrphanPaymentIntent } from "../actions/cancel-orphan-payment-intent";

/** Re-validate cart if tab was hidden for more than 10 minutes */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

interface UsePaymentIntentParams {
	cartItems: Array<{ skuId: string; quantity: number; priceAtAdd: number }>;
	email?: string;
}

interface PaymentIntentState {
	clientSecret: string | null;
	paymentIntentId: string | null;
	subtotal: number;
	shipping: number;
	total: number;
	isLoading: boolean;
	error: string | null;
}

/**
 * Creates a Payment Intent on mount and provides updateAmount for country/discount changes.
 * Uses 500ms debounce on updateAmount to avoid excessive Stripe API calls.
 */
export function usePaymentIntent(params: UsePaymentIntentParams) {
	const [state, setState] = useState<PaymentIntentState>({
		clientSecret: null,
		paymentIntentId: null,
		subtotal: 0,
		shipping: 0,
		total: 0,
		isLoading: true,
		error: null,
	});

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const initCalledRef = useRef(false);
	const hiddenAtRef = useRef<number | null>(null);
	// Latest cart/email — read by retry() without re-creating the callback
	const paramsRef = useRef(params);
	useEffect(() => {
		paramsRef.current = params;
	});

	// Clean up debounce timer on unmount to avoid orphan server action calls
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const initFromCurrentParams = useCallback(async () => {
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		const result = await initializePayment({
			cartItems: paramsRef.current.cartItems,
			email: paramsRef.current.email,
		});

		if (result.success) {
			setState({
				clientSecret: result.clientSecret,
				paymentIntentId: result.paymentIntentId,
				subtotal: result.subtotal,
				shipping: result.shipping,
				total: result.total,
				isLoading: false,
				error: null,
			});
		} else {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: result.error,
			}));
		}
	}, []);

	// Create PI on mount
	useEffect(() => {
		if (initCalledRef.current) return;
		initCalledRef.current = true;
		void initFromCurrentParams();
	}, [initFromCurrentParams]);

	// Re-validate payment intent when tab becomes visible after long inactivity
	useEffect(() => {
		function handleVisibilityChange() {
			if (document.hidden) {
				hiddenAtRef.current = Date.now();
				return;
			}

			// Tab became visible - check if it was hidden long enough to be stale
			const hiddenAt = hiddenAtRef.current;
			hiddenAtRef.current = null;

			if (!hiddenAt || !state.paymentIntentId) return;

			const elapsed = Date.now() - hiddenAt;
			if (elapsed < STALE_THRESHOLD_MS) return;

			// Re-initialize payment to refresh prices and validate PI is still active.
			// The old PI may become orphaned if the cart changed (different idempotency key).
			// Stripe auto-cancels uncaptured PIs after 7 days — no manual cleanup needed.
			const previousPiId = state.paymentIntentId;
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			void initializePayment({
				cartItems: params.cartItems,
				email: params.email,
			}).then((result) => {
				if (result.success) {
					// Cancel the previous PI if a new one was created (cart hash changed)
					if (previousPiId && result.paymentIntentId !== previousPiId) {
						void cancelOrphanPaymentIntent(previousPiId);
					}
					setState({
						clientSecret: result.clientSecret,
						paymentIntentId: result.paymentIntentId,
						subtotal: result.subtotal,
						shipping: result.shipping,
						total: result.total,
						isLoading: false,
						error: null,
					});
				} else {
					setState((prev) => ({
						...prev,
						isLoading: false,
						error: result.error,
					}));
				}
			});
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [state.paymentIntentId, params.cartItems, params.email]);

	function updateAmount(country: string, postalCode: string, discountAmount: number) {
		if (!state.paymentIntentId) return;

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(async () => {
			const result = await updatePaymentAmount({
				paymentIntentId: state.paymentIntentId!,
				subtotal: state.subtotal,
				country,
				postalCode,
				discountAmount,
			});

			if (result.success) {
				setState((prev) => ({
					...prev,
					shipping: result.shipping,
					total: result.newTotal,
				}));
			}
		}, 500);
	}

	return {
		...state,
		updateAmount,
		retry: initFromCurrentParams,
	};
}
