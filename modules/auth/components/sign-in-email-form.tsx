"use client";

import { useAppForm } from "@/shared/components/forms";
import { emailSchema } from "@/shared/schemas/email.schemas";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { AUTH_ERROR_CODES } from "@/modules/auth/constants/error-messages";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { Spinner } from "@/shared/components/ui/spinner";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";
import { useSignInEmail } from "@/modules/auth/hooks/use-sign-in-email";

export function SignInEmailForm({ callbackURL }: { callbackURL: string }) {
	const { action, isPending, state } = useSignInEmail();
	const errorRef = useRef<HTMLDivElement>(null);
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			callbackURL: callbackURL || "/",
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

	// Gate de soumission : rien ne part au serveur tant que le client est invalide
	// (sinon chaque faute de frappe consommerait une tentative de rate limit) et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "SignInEmailForm",
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

				{/* Error message */}
				{isActionError && state.message && (
					<Alert
						ref={errorRef}
						variant="destructive"
						tabIndex={-1}
						role="alert"
						aria-live="assertive"
					>
						<AlertDescription>
							{state.message === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED ? (
								<>
									Votre email n'a pas été vérifié.{" "}
									<Link
										href="/renvoyer-verification"
										className="font-medium underline hover:no-underline"
									>
										Renvoyer l'email de vérification
									</Link>
								</>
							) : (
								state.message
							)}
						</AlertDescription>
					</Alert>
				)}

				{/* Champs cachés */}
				<input type="hidden" name="callbackURL" value={callbackURL} />

				<FieldSet>
					<FieldGroup>
						{/* Email field - Using pre-bound InputField component */}
						<form.AppField
							name="email"
							validators={{
								// SSOT : même schéma que le serveur (`emailSchema`), qui trim/lowercase.
								// La regex maison rejetait un email collé avec une espace de fin que
								// l'action, elle, acceptait.
								onChange: emailSchema,
							}}
						>
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
									description="Utilisez l'adresse email associée à votre compte Synclune."
									required
								/>
							)}
						</form.AppField>

						{/* Password field - Using pre-bound PasswordInputField component */}
						<form.AppField
							name="password"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value) return "Le mot de passe est requis";
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.PasswordInputField
									label="Mot de passe"
									autoComplete="current-password"
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
							disabled={!canSubmit || isPending}
							className="w-full"
							type="submit"
							aria-busy={isPending}
						>
							{isPending ? (
								<>
									<Spinner presentational />
									<span>Connexion…</span>
								</>
							) : (
								"Se connecter"
							)}
						</Button>
					)}
				</form.Subscribe>

				{/* Lien "Mot de passe oublié" */}
				<div className="text-center">
					<Link
						href="/mot-de-passe-oublie"
						className="text-muted-foreground hover:text-foreground text-sm transition-colors"
					>
						Mot de passe oublié ?
					</Link>
				</div>
			</form>
		</ErrorShake>
	);
}
