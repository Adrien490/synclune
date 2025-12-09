"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRequestPasswordReset } from "@/modules/auth/hooks/use-request-password-reset";

export function RequestPasswordResetForm() {
	const { action, isPending, state } = useRequestPasswordReset();

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
				<Alert>
					<CheckCircle2 />
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			{/* Message d'erreur */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert variant="destructive">
						<XCircle />
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
									return "Petite erreur de saisie ? Ton email semble invalide 🌸";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<Field data-invalid={field.state.meta.errors.length > 0}>
								<FieldLabel htmlFor={field.name}>
									Email
									<span className="text-destructive ml-1">*</span>
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									autoComplete="email"
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									aria-invalid={field.state.meta.errors.length > 0}
									aria-describedby={
										field.state.meta.errors.length > 0
											? `${field.name}-error`
											: undefined
									}
									aria-required="true"
								/>
								<FieldError
									id={`${field.name}-error`}
									errors={field.state.meta.errors}
								/>
							</Field>
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
