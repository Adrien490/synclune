"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useResetPassword } from "@/modules/auth/hooks/use-reset-password";
import { useEffect, useRef } from "react";

interface ResetPasswordFormProps {
	token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
	const { action, isPending, state } = useResetPassword();
	const errorRef = useRef<HTMLDivElement>(null);

	// Focus sur l'erreur quand elle apparaît
	useEffect(() => {
		if (state?.message && state.status !== ActionStatus.SUCCESS) {
			errorRef.current?.focus();
		}
	}, [state?.message, state?.status]);

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

			{/* Champ caché pour le token */}
			<input type="hidden" name="token" value={token} />

			<FieldSet>
				<FieldGroup>
					<form.AppField
						name="password"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le mot de passe est requis";
								if (value.length < 6) {
									return "Le mot de passe doit contenir au moins 6 caractères";
								}
								if (value.length > 128) {
									return "Le mot de passe ne doit pas dépasser 128 caractères";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.PasswordInputField
								label="Nouveau mot de passe"
								autoComplete="new-password"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

					<form.AppField
						name="confirmPassword"
						validators={{
							onChangeListenTo: ["password"],
							onChange: ({ value, fieldApi }) => {
								if (!value)
									return "La confirmation du mot de passe est requise";
								if (value.length < 6) {
									return "Le mot de passe doit contenir au moins 6 caractères";
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
							<field.PasswordInputField
								label="Confirmer le mot de passe"
								autoComplete="new-password"
								disabled={isPending}
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
							? "Mot de passe réinitialisé"
							: "Réinitialiser mon mot de passe"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
