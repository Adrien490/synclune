"use client";

import { markAsShipped } from "@/modules/orders/actions/mark-as-shipped";
import { useAppForm } from "@/shared/components/forms";
import type { Carrier } from "@/modules/orders/utils/carrier.utils";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

interface UseMarkAsShippedFormOptions {
	orderId: string;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de marquage comme expédié
 * Utilise TanStack Form avec Next.js App Router
 */
export const useMarkAsShippedForm = (options: UseMarkAsShippedFormOptions) => {
	const handleComplete = (result: unknown) => {
		if (
			result &&
			typeof result === "object" &&
			"message" in result &&
			typeof result.message === "string"
		) {
			options.onSuccess?.(result.message);
		}
	};

	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsShipped,
			createToastCallbacks({
				loadingMessage: "Marquage comme expédiée…",
				onSuccess: handleComplete,
				onWarning: handleComplete, // Fermer le dialog aussi en cas de warning
			}),
		),
		undefined,
	);

	const form = useAppForm({
		defaultValues: {
			id: options.orderId,
			trackingNumber: "",
			trackingUrl: "",
			// Pas de transporteur pré-sélectionné : un défaut « colissimo » devenait
			// une attribution inventée persistée en base si l'admin validait sans
			// toucher au picker (audit 2026-08-01). `""` = placeholder affiché,
			// submit bloqué tant qu'aucun choix explicite (ou détection auto).
			carrier: "" as Carrier | "",
			sendEmail: true,
			customUrlMode: false,
		},
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
			[state],
		),
	});

	return {
		form,
		state,
		action,
		isPending,
	};
};
