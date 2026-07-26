"use client";

import { CircleX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useUpdateAddress } from "@/modules/addresses/hooks/use-update-address";
import { useAddressForm } from "@/modules/addresses/hooks/use-address-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { ActionStatus } from "@/shared/types/server-action";

import { AddressFormFields } from "./address-form-fields";
import type { UserAddress } from "../types/user-addresses.types";

const LIST_PATH = "/adresses";

interface EditAddressFormProps {
	address: UserAddress;
}

/**
 * Formulaire de modification d'adresse (mobile).
 *
 * Équivalent pleine largeur de `AddressFormDialog` en mode édition : même hook
 * de formulaire (pré-rempli via `useAddressForm(address)`) et mêmes champs
 * partagés (`AddressFormFields`), mais redirige vers la liste des adresses
 * après succès au lieu de fermer une dialog. L'item « Modifier » de
 * `AddressCardActions` navigue ici sur mobile ; le desktop garde la dialog.
 */
export function EditAddressForm({ address }: EditAddressFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const { form } = useAddressForm(address);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const { action, isPending, state } = useUpdateAddress(address.id, {
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
		context: "EditAddressForm",
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de modification d'adresse"
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
						idleLabel="Enregistrer les modifications"
						pendingLabel="Enregistrement…"
						className="w-full sm:w-auto"
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
