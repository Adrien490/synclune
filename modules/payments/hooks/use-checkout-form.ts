"use client";

import { useAppForm } from "@/shared/components/forms";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import { createCheckoutSession } from "@/modules/payments/actions/create-checkout-session";
import { createToastCallbacks, hasMessage } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "sonner";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
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
				showErrorToast: false,
				onError: (result: unknown) => {
					// Only show toast for non-validation errors (rate limit, server errors, etc.)
					// Validation errors are already displayed inline under the relevant fields
					if (
						hasMessage(result) &&
						"status" in result &&
						result.status !== ActionStatus.VALIDATION_ERROR
					) {
						toast.error(result.message);
					}
				},
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
						// Appeler le callback pour afficher le formulaire Stripe Embedded
						const data = result.data as {
							clientSecret: string;
							orderId: string;
							orderNumber: string;
						};
						onSuccess?.({
							clientSecret: data.clientSecret,
							orderId: data.orderId,
							orderNumber: data.orderNumber,
						});
					}
				},
			}),
		),
		undefined,
	);

	const form = useAppForm({
		...getCheckoutFormOptions(session, addresses),
		// Merge server state with form state for validation errors
		transform: useTransform((baseForm) => mergeForm(baseForm, (state as unknown) ?? {}), [state]),
	});

	return {
		form,
		state,
		action,
		isPending,
	};
};
