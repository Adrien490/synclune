"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
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
			createToastCallbacks({ loadingMessage: "Mise à jour du message..." }),
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
			<form.AppField name="closureMessage">
				{(field) => (
					<field.TextareaField
						label="Message affiché aux clients"
						placeholder="La boutique est temporairement fermée..."
						maxLength={500}
						showCounter
						rows={3}
						required
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
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
					<div className="flex justify-end">
						<Button
							type="submit"
							size="sm"
							variant="outline"
							disabled={isPending || !isDirty || !closureMessage.trim()}
							aria-busy={isPending}
							onClick={() => triggerHaptic("light")}
							className="min-h-11"
						>
							{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
							{isPending ? "Mise à jour..." : "Mettre à jour le message"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
