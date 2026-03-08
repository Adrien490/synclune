"use client";

import { useAppForm } from "@/shared/components/forms";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import { createCheckoutSession } from "@/modules/payments/actions/create-checkout-session";
import { createToastCallbacks, hasMessage } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "sonner";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState, useEffect } from "react";
import {
	DRAFT_VERSION,
	getCheckoutFormOptions,
	type CheckoutDraft,
} from "../utils/checkout-form.utils";

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
						// Nettoyer le draft après succès
						if (typeof window !== "undefined") {
							localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT);
						}

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

	// Restore saved draft from localStorage after mount (avoids hydration mismatch)
	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT);
			if (!raw) return;

			const draft = JSON.parse(raw) as CheckoutDraft;

			// Invalidate incompatible or expired drafts
			if (draft.version !== DRAFT_VERSION) {
				localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT);
				return;
			}
			const ONE_HOUR = 60 * 60 * 1000;
			if (Date.now() - (draft.timestamp ?? 0) > ONE_HOUR) {
				localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT);
				return;
			}

			// Apply draft values via setFieldValue (same pattern as address selection)
			if (draft.email) form.setFieldValue("email", draft.email);
			const s = draft.shipping;
			if (s?.fullName) form.setFieldValue("shipping.fullName", s.fullName);
			// Support legacy firstName/lastName drafts
			if (!s?.fullName && (s?.firstName || s?.lastName)) {
				form.setFieldValue("shipping.fullName", `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim());
			}
			if (s?.addressLine1) form.setFieldValue("shipping.addressLine1", s.addressLine1);
			if (s?.addressLine2) form.setFieldValue("shipping.addressLine2", s.addressLine2);
			if (s?.city) form.setFieldValue("shipping.city", s.city);
			if (s?.postalCode) form.setFieldValue("shipping.postalCode", s.postalCode);
			if (s?.country) form.setFieldValue("shipping.country", s.country);
			if (s?.phoneNumber) form.setFieldValue("shipping.phoneNumber", s.phoneNumber);
		} catch {
			localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps -- form ref is stable

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
