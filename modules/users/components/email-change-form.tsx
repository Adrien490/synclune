"use client";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { useRequestEmailChange } from "@/modules/users/hooks/use-request-email-change";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";

export function EmailChangeForm() {
	const { state, action, isPending } = useRequestEmailChange();

	const form = useAppForm({
		defaultValues: {
			newEmail: "",
		},
		transform: useTransform((baseForm) => mergeForm(baseForm, (state as unknown) ?? {}), [state]),
	});

	return (
		<form action={action} onSubmit={() => form.handleSubmit()} className="space-y-3">
			<form.AppField
				name="newEmail"
				validators={{
					onChange: ({ value }) => {
						if (!value) return undefined;
						const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
						if (!emailRegex.test(value)) {
							return "Adresse email invalide";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<field.InputField
						label="Nouvel email"
						type="email"
						disabled={isPending}
						autoComplete="email"
						placeholder="nouvelle@adresse.com"
					/>
				)}
			</form.AppField>

			<form.Subscribe selector={(s) => [s.canSubmit]}>
				{([canSubmit]) => (
					<Button type="submit" variant="outline" size="sm" disabled={!canSubmit || isPending}>
						{isPending ? "Envoi..." : "Modifier l'email"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
