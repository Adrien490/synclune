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
import Link from "next/link";
import { useResetPassword } from "@/modules/auth/hooks/use-reset-password";

interface ResetPasswordFormProps {
	token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
	const { action, isPending, state } = useResetPassword();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
			token,
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
					<AlertDescription>
						<div className="space-y-2">
							<p>{state.message}</p>
							<Link
								href="/connexion"
								className="inline-block text-sm font-medium hover:underline"
							>
								Se connecter maintenant
							</Link>
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Message d'erreur */}
			{state?.status !== ActionStatus.SUCCESS && state?.message && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<XCircle aria-hidden="true" />
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			{/* Champ caché pour le token */}
			<input type="hidden" name="token" value={token} />

			<FieldSet>
				<FieldGroup>
					<form.AppField
						name="password"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le mot de passe est requis";
								if (value.length < 8) {
									return "Le mot de passe doit contenir au moins 8 caractères";
								}
								if (value.length > 128) {
									return "Le mot de passe ne doit pas dépasser 128 caractères";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<Field data-invalid={field.state.meta.errors.length > 0}>
								<FieldLabel htmlFor={field.name}>
									Nouveau mot de passe
									<span className="text-destructive ml-1">*</span>
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="new-password"
									disabled={isPending}
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

					<form.AppField
						name="confirmPassword"
						validators={{
							onChangeListenTo: ["password"],
							onChange: ({ value, fieldApi }) => {
								if (!value)
									return "La confirmation du mot de passe est requise";
								if (value.length < 8) {
									return "Le mot de passe doit contenir au moins 8 caractères";
								}
								if (value.length > 128) {
									return "Le mot de passe ne doit pas dépasser 128 caractères";
								}
								if (value !== fieldApi.form.getFieldValue("password")) {
									return "Les mots de passe ne correspondent pas";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<Field data-invalid={field.state.meta.errors.length > 0}>
								<FieldLabel htmlFor={field.name}>
									Confirmer le mot de passe
									<span className="text-destructive ml-1">*</span>
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="new-password"
									disabled={isPending}
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
							? "Mot de passe réinitialisé"
							: "Réinitialiser mon mot de passe"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
