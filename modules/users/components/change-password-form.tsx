"use client";

import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { PasswordStrengthIndicator } from "@/shared/components/forms/password-strength-indicator";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { ActionStatus } from "@/shared/types/server-action";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useChangePassword } from "@/modules/auth/hooks/use-change-password";

interface ChangePasswordFormProps {
	onOpenChange?: (open: boolean) => void;
}

export function ChangePasswordForm({ onOpenChange }: ChangePasswordFormProps) {
	const { action, isPending, state } = useChangePassword({ onOpenChange });

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
			revokeOtherSessions: false,
		},
	});

	// Les VALIDATION_ERROR sont exclues de l'alerte ci-dessous ET du toast
	// (`createToastCallbacks`) : sans ce relais, elles seraient muettes.
	const serverErrors = useServerFieldErrors({ state });

	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "ChangePasswordForm",
	});

	return (
		<form ref={formRef} action={action} className="space-y-6" onSubmit={handleGatedSubmit}>
			<FormServerErrorAlert errors={serverErrors} />

			{/* Messages */}
			{state?.message && state.status !== ActionStatus.VALIDATION_ERROR && (
				<>
					{state.status === ActionStatus.SUCCESS ? (
						<Alert>
							<CircleCheck />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					) : (
						<Alert variant="destructive">
							<CircleAlert />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}
				</>
			)}

			<RequiredFieldsNote />

			<div className="space-y-4">
				{/* Mot de passe actuel */}
				<form.AppField
					name="currentPassword"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) return "Le mot de passe actuel est requis";
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.PasswordInputField
							label="Mot de passe actuel"
							autoComplete="current-password"
							enterKeyHint="next"
							disabled={isPending || state?.status === ActionStatus.SUCCESS}
							required
						/>
					)}
				</form.AppField>

				{/* Nouveau mot de passe */}
				<form.AppField
					name="newPassword"
					validators={{
						onChangeListenTo: ["currentPassword"],
						onChange: ({ value, fieldApi }) => {
							if (!value) return "Le nouveau mot de passe est requis";
							if (value.length < 8) {
								return "Le mot de passe doit contenir au moins 8 caractères";
							}
							if (value.length > 128) {
								return "Le mot de passe ne doit pas dépasser 128 caractères";
							}
							const currentPassword = fieldApi.form.getFieldValue("currentPassword");
							if (currentPassword && value === currentPassword) {
								return "Le nouveau mot de passe doit être différent de l'ancien";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<field.PasswordInputField
								label="Nouveau mot de passe"
								autoComplete="new-password"
								enterKeyHint="next"
								disabled={isPending || state?.status === ActionStatus.SUCCESS}
								required
							/>
							<form.Subscribe selector={(s) => s.values.newPassword}>
								{(newPassword) => <PasswordStrengthIndicator password={newPassword} />}
							</form.Subscribe>
						</div>
					)}
				</form.AppField>

				{/* Confirmation du mot de passe */}
				<form.AppField
					name="confirmPassword"
					validators={{
						onChangeListenTo: ["newPassword"],
						onChange: ({ value, fieldApi }) => {
							if (!value) return "La confirmation du mot de passe est requise";
							if (value.length < 8) {
								return "Le mot de passe doit contenir au moins 8 caractères";
							}
							if (value.length > 128) {
								return "Le mot de passe ne doit pas dépasser 128 caractères";
							}
							if (value !== fieldApi.form.getFieldValue("newPassword")) {
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
							enterKeyHint="done"
							disabled={isPending || state?.status === ActionStatus.SUCCESS}
							required
						/>
					)}
				</form.AppField>

				{/* Option pour déconnecter les autres sessions */}
				<form.AppField name="revokeOtherSessions">
					{(field) => (
						<div className="bg-muted/50 rounded-lg border p-4 pt-2">
							<field.CheckboxField
								label={
									<div className="space-y-1">
										<span className="text-sm leading-none font-medium">
											Déconnecter tous les autres appareils
										</span>
										<p className="text-muted-foreground text-xs">
											Déconnecte toutes vos sessions actives sauf celle-ci
										</p>
									</div>
								}
								disabled={isPending || state?.status === ActionStatus.SUCCESS}
							/>
						</div>
					)}
				</form.AppField>
			</div>

			{/* Submit button */}
			<div className="flex justify-end">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button disabled={!canSubmit || isPending} type="submit">
							{isPending ? "Changement en cours…" : "Changer le mot de passe"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
