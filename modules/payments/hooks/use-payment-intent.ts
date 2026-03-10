"use client";

import { useState, useEffect, useRef } from "react";
import { initializePayment } from "../actions/initialize-payment";
import { updatePaymentAmount } from "../actions/update-payment-amount";

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

	// Create PI on mount
	useEffect(() => {
		if (initCalledRef.current) return;
		initCalledRef.current = true;

		async function init() {
			const result = await initializePayment({
				cartItems: params.cartItems,
				email: params.email,
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

		void init();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
	};
}
