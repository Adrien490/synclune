"use client";

import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/shared/components/forms";
import { getCheckoutFormOptions } from "../utils/checkout-form.utils";

/**
 * Hook for the single-page checkout form.
 * Uses TanStack Form for client-side validation only.
 * Payment submission is handled by PayButton via confirmCheckout + stripe.confirmPayment.
 *
 * ## Validation au BLUR, pas à la frappe
 *
 * Tous les validateurs du checkout étaient en `onChange` et `InputField` affiche
 * l'erreur dès que `meta.errors` est non vide (aucun gate `isTouched`). Résultat :
 * taper « J » dans « Nom complet » affichait aussitôt « …au moins 2 caractères », et
 * chaque champ engueulait l'utilisateur pendant qu'il le remplissait — un des défauts
 * d'utilisabilité checkout les mieux documentés. Audit UI/UX paiement 2026-07-26, F1.
 *
 * ⚠️ `revalidateLogic` **compose** avec `defaultValidationLogic`, il ne la remplace
 * pas : garder des validateurs `onChange` en plus les ferait toujours tourner à
 * chaque frappe. La seule clé que `revalidateLogic` lit est `onDynamic` — d'où le
 * renommage de tous les validateurs du tunnel. Verrouillé par
 * `checkout-validation-timing.regression.test.ts`.
 *
 * Portée strictement locale : `createFormHook` n'injecte aucune option par défaut,
 * donc les autres formulaires du repo gardent `defaultValidationLogic`.
 *
 * Comportement obtenu : blur avant la première soumission, puis frappe après
 * (`modeAfterSubmission: "change"`) pour que l'erreur s'efface au fil de la
 * correction. `form.handleSubmit()` valide de toute façon TOUT (l'événement
 * `submit` déclenche `onDynamic` inconditionnellement).
 */
export const useCheckoutForm = () => {
	const form = useAppForm({
		...getCheckoutFormOptions(),
		validationLogic: revalidateLogic({ mode: "blur", modeAfterSubmission: "change" }),
	});

	return { form };
};

export type CheckoutFormInstance = ReturnType<typeof useCheckoutForm>["form"];
