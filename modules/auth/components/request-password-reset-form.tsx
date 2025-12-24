"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRequestPasswordReset } from "@/modules/auth/hooks/use-request-password-reset";
import { useEffect, useRef } from "react";

export function RequestPasswordResetForm() {
	const { action, isPending, state } = useRequestPasswordReset();
	const errorRef = useRef<HTMLDivElement>(null);

	// Focus sur l'erreur quand elle apparaît
	useEffect(() => {
		if (
			state?.message &&
			state.status !== ActionStatus.SUCCESS &&
			state.status !== ActionStatus.INITIAL
		) {
			errorRef.current?.focus();
		}
	}, [state?.message, state?.status]);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
		},
	});

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => form.handleSubmit()}
		>
			{/* Indication des champs obligatoires */}
			<RequiredFieldsNote />

			{/* Message de succès */}
			{state?.status === ActionStatus.SUCCESS && state?.message && (
				<Alert role="status" aria-live="polite">
					<CheckCircle2 aria-hidden="true" />
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			{/* Message d'erreur */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert
						ref={errorRef}
						variant="destructive"
						tabIndex={-1}
						role="alert"
						aria-live="assertive"
					>
						<XCircle aria-hidden="true" />
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

			<FieldSet>
				<FieldGroup>
					<form.AppField
						name="email"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "L'email est requis";
								if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
									return "Format d'email invalide";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Email"
								type="email"
								inputMode="email"
								autoComplete="email"
								spellCheck={false}
								disabled={isPending || state?.status === ActionStatus.SUCCESS}
								required
							/>
						)}
					</form.AppField>
				</FieldGroup>
			</FieldSet>

			<form.Subscribe selector={(state) => [state.canSubmit]}>
				{([canSubmit]) => (
					<Button
						disabled={
							!canSubmit || isPending || state?.status === ActionStatus.SUCCESS
						}
						className="w-full"
						type="submit"
					>
						{state?.status === ActionStatus.SUCCESS
							? "Email envoyé"
							: "Envoyer le lien de réinitialisation"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
