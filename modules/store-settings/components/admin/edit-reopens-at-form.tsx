"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateReopensAt } from "../../actions/update-reopens-at";
import { formatDateForInput } from "../../utils/format-date-for-input";

interface EditReopensAtFormProps {
	currentReopensAt: Date | null;
}

export function EditReopensAtForm({ currentReopensAt }: EditReopensAtFormProps) {
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const initialValue = formatDateForInput(currentReopensAt);

	const form = useAppForm({
		defaultValues: { reopensAt: initialValue },
	});

	const [, formAction, isPending] = useActionState(
		withCallbacks(
			updateReopensAt,
			createToastCallbacks({ loadingMessage: "Mise à jour de la date..." }),
		),
		undefined,
	);

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
		>
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
					<div className="flex justify-end">
						<Button
							type="submit"
							size="sm"
							variant="outline"
							disabled={isPending || !isDirty}
							aria-busy={isPending}
							onClick={() => triggerHaptic("light")}
							className="min-h-11"
						>
							{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
							{isPending ? "Mise à jour..." : "Mettre à jour la date"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
