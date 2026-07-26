"use client";

import { useActionState } from "react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateReopensAt } from "../../actions/update-reopens-at";
import { formatParisDateForInput } from "../../utils/paris-datetime";

interface EditReopensAtFormProps {
	currentReopensAt: Date | null;
}

export function EditReopensAtForm({ currentReopensAt }: EditReopensAtFormProps) {
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const initialValue = formatParisDateForInput(currentReopensAt);

	const form = useAppForm({
		defaultValues: { reopensAt: initialValue },
	});

	const [state, formAction, isPending] = useActionState(
		withCallbacks(
			updateReopensAt,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la date…",
				onSuccess: () => {
					// Le champ reste « dirty » vis-à-vis de `defaultValues` après save (pas
					// de `form.reset()` : il rétablirait l'ancienne valeur) — sans ceci la
					// garde prompterait alors que tout est enregistré.
					allowNavigation();
				},
			}),
		),
		undefined,
	);

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action: formAction,
		isPending,
		focusFirstInvalid,
		context: "EditReopensAtForm",
	});

	// `allowNavigation` récupéré (et non jeté) : la garde est désormais effective
	// sur la navigation client-side, elle doit pouvoir être relâchée après save.
	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={handleGatedSubmit}
			className="space-y-3"
			aria-busy={isPending}
			data-pending={isPending ? "true" : undefined}
		>
			<FormServerErrorAlert errors={serverErrors} />

			<form.AppField name="reopensAt">
				{(field) => (
					<field.DateTimeField
						label="Date de réouverture automatique"
						placeholder="Sélectionner une date"
						optional
						disabled={isPending}
						helpText="Laisser vide pour désactiver la réouverture automatique."
					/>
				)}
			</form.AppField>

			<form.Subscribe selector={(state) => state.values.reopensAt !== initialValue}>
				{(isDirty) => (
					<AdminFormFooter pending={isPending}>
						<div className="sm:flex sm:justify-end">
							<form.AppForm>
								<form.SubmitButton
									isPending={isPending}
									idleLabel="Mettre à jour la date"
									pendingLabel="Mise à jour…"
									variant="outline"
									disabled={!isDirty}
									className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:w-auto"
								/>
							</form.AppForm>
						</div>
					</AdminFormFooter>
				)}
			</form.Subscribe>
		</form>
	);
}
