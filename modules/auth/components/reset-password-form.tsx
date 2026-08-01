"use client";

import { useAppForm } from "@/shared/components/forms";
import { newPasswordSchema } from "@/modules/auth/schemas/auth.schemas";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CircleCheck, CircleX } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import Link from "next/link";
import { useResetPassword } from "@/modules/auth/hooks/use-reset-password";
import { PasswordStrengthIndicator } from "@/shared/components/forms/password-strength-indicator";
import { useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";

interface ResetPasswordFormProps {
	token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
	const { action, isPending, state } = useResetPassword();
	const errorRef = useRef<HTMLDivElement>(null);
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
			token,
		},
	});

	const isClientFormValid = useStore(form.store, (s) => s.isValid);

	// Une VALIDATION_ERROR serveur n'est masquée que si des erreurs de champ
	// sont déjà affichées côté client ; si le client jugeait le form valide
	// (divergence client/serveur), elle doit rester visible.
	const isActionError =
		!!state?.message &&
		state.status !== ActionStatus.SUCCESS &&
		(state.status !== ActionStatus.VALIDATION_ERROR || isClientFormValid);

	const { shake, onShakeComplete } = useFormErrorShake(isActionError, state?.message);

	// Focus on error when it appears + haptic feedback
	useEffect(() => {
		if (isActionError) {
			errorRef.current?.focus();
			triggerHaptic("error");
		}
	}, [state?.message, state?.status, isActionError]);

	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			triggerHaptic("success");
		}
	}, [state?.status]);

	// Gate de soumission : rien ne part au serveur tant que le client est invalide
	// (sinon chaque faute de frappe consommerait une tentative de rate limit) et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "ResetPasswordForm",
	});

	return (
		<ErrorShake shake={shake} intensity={6} onShakeComplete={onShakeComplete}>
			<form
				ref={formRef}
				action={action}
				className="space-y-6"
				onSubmit={(event) => {
					triggerHaptic("medium");
					handleGatedSubmit(event);
				}}
			>
				{/* Indication des champs obligatoires */}
				<RequiredFieldsNote />

				{/* Message de succès */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert role="status" aria-live="polite">
						<CircleCheck aria-hidden="true" />
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
				{isActionError && state.message && (
					<Alert
						ref={errorRef}
						variant="destructive"
						tabIndex={-1}
						role="alert"
						aria-live="assertive"
					>
						<CircleX aria-hidden="true" />
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
								// SSOT : mêmes bornes que le schéma serveur `newPasswordSchema`.
								onChange: ({ value }: { value: string }) => {
									if (!value) return "Le mot de passe est requis";
									const parsed = newPasswordSchema.safeParse(value);
									return parsed.success ? undefined : parsed.error.issues[0]?.message;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<field.PasswordInputField
										label="Nouveau mot de passe"
										autoComplete="new-password"
										enterKeyHint="next"
										disabled={isPending}
										required
									/>
									<form.Subscribe selector={(state) => state.values.password}>
										{(password) => <PasswordStrengthIndicator password={password} />}
									</form.Subscribe>
								</div>
							)}
						</form.AppField>

						<form.AppField
							name="confirmPassword"
							validators={{
								onChangeListenTo: ["password"],
								onChange: ({ value, fieldApi }) => {
									if (!value) return "La confirmation du mot de passe est requise";
									const parsed = newPasswordSchema.safeParse(value);
									if (!parsed.success) return parsed.error.issues[0]?.message;
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
									enterKeyHint="done"
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
							disabled={!canSubmit || isPending || state?.status === ActionStatus.SUCCESS}
							className="w-full"
							type="submit"
							aria-busy={isPending}
						>
							{isPending ? (
								<>
									<Spinner presentational />
									Réinitialisation…
								</>
							) : state?.status === ActionStatus.SUCCESS ? (
								"Mot de passe réinitialisé"
							) : (
								"Réinitialiser mon mot de passe"
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</ErrorShake>
	);
}
