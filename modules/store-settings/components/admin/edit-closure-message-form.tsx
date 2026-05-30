"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
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

	const [, formAction, isPending] = useActionState(
		withCallbacks(
			updateClosureMessage,
			createToastCallbacks({ loadingMessage: "Mise à jour du message…" }),
		),
		undefined,
	);

	useUnsavedChanges(form.state.isDirty, !isPending);

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={() => {
				queueMicrotask(() => {
					focusFirstInvalid();
				});
			}}
			className="space-y-3"
			aria-busy={isPending}
			data-pending={isPending ? "true" : undefined}
		>
			<span className="sr-only" role="status" aria-live="polite">
				{isPending ? "Mise à jour du message en cours…" : ""}
			</span>

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
					<div className="sm:flex sm:justify-end">
						<Button
							type="submit"
							variant="outline"
							disabled={isPending || !isDirty || !closureMessage.trim()}
							aria-busy={isPending}
							onClick={() => triggerHaptic("light")}
							className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:w-auto"
						>
							{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
							{isPending ? "Mise à jour…" : "Mettre à jour le message"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
