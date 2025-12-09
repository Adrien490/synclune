"use client";

import { useAppForm } from "@/shared/components/forms";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import { createCheckoutSession } from "@/modules/payments/actions/create-checkout-session";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { getCheckoutFormOptions } from "../constants/checkout-form-options";

interface UseCheckoutFormOptions {
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
	onSuccess?: (checkoutUrl: string) => void;
}

/**
 * Hook pour le formulaire de checkout
 * Utilise TanStack Form avec Next.js App Router
 * Redirige automatiquement vers la session Stripe Checkout après succès
 *
 * @param options - Options incluant session, addresses et callback onSuccess
 */
export const useCheckoutForm = (options: UseCheckoutFormOptions) => {
	const { session, addresses, onSuccess } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			createCheckoutSession,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"url" in result.data &&
						typeof result.data.url === "string"
					) {
						// Nettoyer le draft après succès
						if (typeof window !== "undefined") {
							localStorage.removeItem("checkout-form-draft");
						}

						// Rediriger vers Stripe Checkout
						const checkoutUrl = result.data.url;
						onSuccess?.(checkoutUrl);

						// Redirection immédiate vers Stripe
						window.location.href = checkoutUrl;
					}
				},
			})
		),
		undefined
	);

	const form = useAppForm({
		...getCheckoutFormOptions(session, addresses),
		// Merge server state with form state for validation errors
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	// Subscribe to form errors for display
	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
};
