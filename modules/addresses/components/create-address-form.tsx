"use client";

import { CircleX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCreateAddress } from "@/modules/addresses/hooks/use-create-address";
import { useAddressForm } from "@/modules/addresses/hooks/use-address-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { ActionStatus } from "@/shared/types/server-action";

import { AddressFormFields } from "./address-form-fields";

const LIST_PATH = "/adresses";

/**
 * Formulaire de création d'adresse (mobile).
 *
 * Équivalent pleine largeur de `AddressFormDialog` : même hook de formulaire et
 * mêmes champs partagés (`AddressFormFields`), mais redirige vers la liste des
 * adresses après succès au lieu de fermer une dialog. Le bouton mobile
 * `CreateAddressButton` navigue ici ; le desktop garde la dialog.
 */
export function CreateAddressForm() {
	const router = useRouter();
	const haptic = useHaptic();
	const { form } = useAddressForm();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const { action, isPending, state } = useCreateAddress({
		onSuccess: () => {
			haptic("success");
			// Native navigation (pas de withViewTransition : nav post-mutation racy).
			router.push(LIST_PATH);
		},
	});

	// WCAG 3.3.1 — après une erreur serveur, focus l'alerte (les erreurs serveur
	// ne sont pas mappées aux champs) avec fallback sur le premier champ invalide.
	const errorRef = useRef<HTMLDivElement>(null);
	const previousState = useRef(state);
	useEffect(() => {
		if (
			state &&
			state !== previousState.current &&
			state.status !== ActionStatus.SUCCESS &&
			state.status !== ActionStatus.INITIAL
		) {
			if (errorRef.current) {
				errorRef.current.focus();
			} else {
				focusFirstInvalid();
			}
		}
		previousState.current = state;
	}, [state, focusFirstInvalid]);

	// Gate de soumission : bloque l'aller-retour serveur sur formulaire invalide et
	// la resoumission en vol (touche Entrée ⇒ deux adresses créées).
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "CreateAddressForm",
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de création d'adresse"
			className="space-y-6"
			onSubmit={handleGatedSubmit}
			onInvalidCapture={onInvalidCapture}
		>
			{/* Error message — shadcn Alert ships role="alert" + aria-live (WCAG 4.1.3) */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert ref={errorRef} tabIndex={-1} variant="destructive">
						<CircleX aria-hidden="true" />
						<AlertDescription className="font-medium">{state.message}</AlertDescription>
					</Alert>
				)}

			<AddressFormFields form={form} isPending={isPending} />

			<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
				<Button asChild variant="outline" type="button" className="w-full sm:w-auto">
					<Link href={LIST_PATH}>Annuler</Link>
				</Button>
				<form.AppForm>
					<form.SubmitButton
						isPending={isPending}
						idleLabel="Ajouter l'adresse"
						pendingLabel="Enregistrement…"
						className="w-full sm:w-auto"
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
