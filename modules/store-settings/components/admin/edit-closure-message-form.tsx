"use client";

import { useActionState } from "react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateClosureMessage } from "../../actions/update-closure-message";

interface EditClosureMessageFormProps {
	currentMessage: string;
}

export function EditClosureMessageForm({ currentMessage }: EditClosureMessageFormProps) {
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: { closureMessage: currentMessage },
	});

	const [state, formAction, isPending] = useActionState(
		withCallbacks(
			updateClosureMessage,
			createToastCallbacks({
				loadingMessage: "Mise à jour du message…",
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
		context: "EditClosureMessageForm",
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

			<RequiredFieldsNote />

			<form.AppField name="closureMessage">
				{(field) => (
					<field.TextareaField
						label="Message affiché aux clients"
						placeholder="La boutique est temporairement fermée…"
						maxLength={500}
						showCounter
						rows={3}
						required
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
						className="resize-none"
					/>
				)}
			</form.AppField>

			<form.Subscribe
				selector={(state) => ({
					closureMessage: state.values.closureMessage,
					isDirty: state.values.closureMessage.trim() !== currentMessage.trim(),
				})}
			>
				{({ closureMessage, isDirty }) => (
					<AdminFormFooter pending={isPending}>
						<div className="sm:flex sm:justify-end">
							<form.AppForm>
								<form.SubmitButton
									isPending={isPending}
									idleLabel="Mettre à jour le message"
									pendingLabel="Mise à jour…"
									variant="outline"
									disabled={!isDirty || !closureMessage.trim()}
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
