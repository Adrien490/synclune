"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useSignUpEmail } from "@/modules/auth/hooks/use-sign-up-email";
import { signUpEmailClientSchema } from "@/modules/auth/schemas/auth.schemas";
import { PasswordStrengthIndicator } from "@/shared/components/forms/password-strength-indicator";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";

export function SignUpEmailForm() {
	const { state, action, isPending } = useSignUpEmail({
		onSuccess: (_message: string) => {
			form.reset();
		},
	});
	const errorRef = useRef<HTMLDivElement>(null);
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// TanStack Form setup — validation dérivée du schéma serveur (F7, SSOT :
	// signUpEmailClientSchema = signUpEmailSchema.shape.* + acceptTerms boolean)
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
			acceptTerms: false as boolean,
		},
		validators: {
			onChange: signUpEmailClientSchema,
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
		context: "SignUpEmailForm",
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
				<RequiredFieldsNote />

				{state?.message && (state.status === ActionStatus.SUCCESS || isActionError) && (
					<>
						{state.status === ActionStatus.SUCCESS ? (
							<Alert role="status" aria-live="polite">
								<CircleCheck aria-hidden="true" />
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						) : (
							<Alert
								ref={errorRef}
								variant="destructive"
								tabIndex={-1}
								role="alert"
								aria-live="assertive"
							>
								<CircleAlert aria-hidden="true" />
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}
					</>
				)}

				<div className="space-y-4">
					<form.AppField name="name">
						{(field) => (
							<field.InputField
								label="Prénom"
								type="text"
								autoComplete="given-name"
								autoCapitalize="words"
								// iOS « corrige » sinon les prénoms peu courants. `profile-form`
								// posait déjà cet attribut — les deux surfaces divergeaient.
								autoCorrect="off"
								enterKeyHint="next"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

					<form.AppField name="email">
						{(field) => (
							<field.InputField
								label="Email"
								type="email"
								inputMode="email"
								enterKeyHint="next"
								autoComplete="email"
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

					<form.AppField name="password">
						{(field) => (
							<div className="space-y-2">
								<field.PasswordInputField
									label="Mot de passe"
									autoComplete="new-password"
									enterKeyHint="done"
									disabled={isPending}
									description="8 caractères minimum. Utilisez majuscules, chiffres et symboles pour un mot de passe robuste."
									required
								/>
								<form.Subscribe selector={(state) => state.values.password}>
									{(password) => <PasswordStrengthIndicator password={password} />}
								</form.Subscribe>
							</div>
						)}
					</form.AppField>
				</div>

				<form.AppField name="acceptTerms">
					{(field) => (
						<field.CheckboxField
							required
							disabled={isPending}
							aria-label="Accepter les conditions générales et la politique de confidentialité"
							label={
								<>
									J'accepte les{" "}
									<Link
										href="/cgv"
										className="underline hover:no-underline"
										target="_blank"
										rel="noopener noreferrer"
									>
										conditions générales
									</Link>{" "}
									et la{" "}
									<Link
										href="/confidentialite"
										className="underline hover:no-underline"
										target="_blank"
										rel="noopener noreferrer"
									>
										politique de confidentialité
									</Link>
								</>
							}
						/>
					)}
				</form.AppField>

				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button
							disabled={!canSubmit || isPending}
							className="w-full"
							type="submit"
							aria-busy={isPending}
						>
							{isPending ? (
								<>
									<LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
									<span>Inscription en cours…</span>
								</>
							) : (
								"S'inscrire"
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</ErrorShake>
	);
}
