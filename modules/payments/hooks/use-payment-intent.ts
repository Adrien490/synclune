"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { initializePayment } from "../actions/initialize-payment";
import { updatePaymentAmount } from "../actions/update-payment-amount";
import { cancelOrphanPaymentIntent } from "../actions/cancel-orphan-payment-intent";
import { validateCart } from "@/modules/cart/actions/validate-cart";

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

	const router = useRouter();
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

	async function initFromCurrentParams() {
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
	}

	// Create PI on mount — runs once via initCalledRef guard.
	useEffect(() => {
		if (initCalledRef.current) return;
		initCalledRef.current = true;
		void initFromCurrentParams();
	}, []);

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
			// Also re-validate cart in parallel (stock may have changed during inactivity).
			// The old PI may become orphaned if the cart changed (different idempotency key).
			// Stripe auto-cancels uncaptured PIs after 7 days — no manual cleanup needed.
			const previousPiId = state.paymentIntentId;
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			void Promise.all([
				initializePayment({
					cartItems: paramsRef.current.cartItems,
					email: paramsRef.current.email,
				}),
				validateCart(),
			]).then(([piResult, cartValidation]) => {
				// If cart is no longer valid (stock/availability changed), reload the page
				// so the parent server component re-renders the issues banner.
				if (!cartValidation.isValid && cartValidation.issues.length > 0) {
					router.refresh();
					return;
				}

				if (piResult.success) {
					// Cancel the previous PI if a new one was created (cart hash changed)
					if (previousPiId && piResult.paymentIntentId !== previousPiId) {
						void cancelOrphanPaymentIntent(previousPiId);
					}
					setState({
						clientSecret: piResult.clientSecret,
						paymentIntentId: piResult.paymentIntentId,
						subtotal: piResult.subtotal,
						shipping: piResult.shipping,
						total: piResult.total,
						isLoading: false,
						error: null,
					});
				} else {
					setState((prev) => ({
						...prev,
						isLoading: false,
						error: piResult.error,
					}));
				}
			});
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [state.paymentIntentId, router]);

	function updateAmount(country: string, postalCode: string, discountCode: string | null) {
		if (!state.paymentIntentId) return;

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		const piIdAtSchedule = state.paymentIntentId;
		debounceTimerRef.current = setTimeout(async () => {
			// Subtotal AND discount are recomputed server-side (audit F1) — the client
			// only sends the applied promo code, never an amount.
			const result = await updatePaymentAmount({
				paymentIntentId: piIdAtSchedule,
				country,
				postalCode,
				discountCode,
			});

			if (result.success) {
				setState((prev) => ({
					...prev,
					subtotal: result.subtotal,
					shipping: result.shipping,
					total: result.newTotal,
					error: null,
				}));
				return;
			}

			// AUDIT-BIZ-001 : l'échec était totalement avalé (pas de branche `else`).
			// Le total AFFICHÉ reste juste — il est recalculé localement via le même
			// SSOT `calculateShipping`, et `confirmCheckout` repose de toute façon le
			// montant autoritaire sur le PI avant capture — mais le client pouvait
			// rester sur un PI périmé sans aucun retour, notamment sur
			// « Commande déjà initiée » (qui exige un vrai rechargement de page),
			// le rate limit UPDATE_AMOUNT et le circuit breaker Stripe.
			setState((prev) => ({ ...prev, error: result.error }));
		}, 500);
	}

	return {
		...state,
		updateAmount,
		retry: initFromCurrentParams,
	};
}
