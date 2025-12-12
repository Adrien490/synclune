"use client";

import { useAppForm } from "@/shared/components/forms";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import { createCheckoutSession } from "@/modules/payments/actions/create-checkout-session";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { getCheckoutFormOptions } from "../utils/checkout-form.utils";

interface UseCheckoutFormOptions {
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
	onSuccess?: (data: { clientSecret: string; orderId: string; orderNumber: string }) => void;
}

/**
 * Hook pour le formulaire de checkout
 * Utilise TanStack Form avec Next.js App Router
 * Affiche le formulaire Stripe Embedded après validation de l'adresse
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
						"clientSecret" in result.data &&
						typeof result.data.clientSecret === "string"
					) {
						// Nettoyer le draft après succès
						if (typeof window !== "undefined") {
							localStorage.removeItem("checkout-form-draft");
						}

						// Appeler le callback pour afficher le formulaire Stripe Embedded
						const data = result.data as {
							clientSecret: string
							orderId: string
							orderNumber: string
						}
						onSuccess?.({
							clientSecret: data.clientSecret,
							orderId: data.orderId,
							orderNumber: data.orderNumber,
						});
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
