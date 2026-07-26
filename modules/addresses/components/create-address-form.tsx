"use client";

import { CircleX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useStore } from "@tanstack/react-form";

import { useCreateAddress } from "@/modules/addresses/hooks/use-create-address";
import { useAddressForm } from "@/modules/addresses/hooks/use-address-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
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
	const isDirty = useStore(form.store, (s) => s.isDirty);

	// `onSuccess` a besoin de `allowNavigation`, qui a besoin de `isPending`, qui
	// vient de `useCreateAddress` : le cycle se casse par une ref (même idiome que
	// les formulaires admin, cf. `create-color-form.tsx`).
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { action, isPending, state } = useCreateAddress({
		onSuccess: () => {
			haptic("success");
			// Lever le garde AVANT de naviguer, sinon la redirection post-succès
			// déclencherait elle-même le dialogue « modifications non enregistrées ».
			allowNavigationRef.current?.();
			// Native navigation (pas de withViewTransition : nav post-mutation racy).
			router.push(LIST_PATH);
		},
	});

	// Une adresse à moitié saisie (8 champs, dont une recherche d'adresse) était
	// perdue sans le moindre avertissement sur un retour arrière ou une fermeture
	// d'onglet. On suit la convention du checkout (`checkout-form.tsx`) — surface
	// client, sans exclusion mobile : celle des formulaires admin
	// (`!isPending && !isMobile`) existe pour ne pas entrer en conflit avec le geste
	// de retour natif du navigateur sur mobile.
	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending, {
		message: "Cette adresse n'est pas enregistrée. Quitter la page ?",
	});

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

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
