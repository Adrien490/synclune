"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useSignUpEmail } from "@/modules/auth/hooks/use-sign-up-email";
import { PasswordStrengthIndicator } from "@/shared/components/forms/password-strength-indicator";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function SignUpEmailForm() {
	const { state, action, isPending } = useSignUpEmail({
		onSuccess: (_message: string) => {
			form.reset();
		},
	});
	const errorRef = useRef<HTMLDivElement>(null);

	const isActionError =
		!!state?.message &&
		state.status !== ActionStatus.SUCCESS &&
		state.status !== ActionStatus.VALIDATION_ERROR;

	const { shake, onShakeComplete } = useFormErrorShake(isActionError, state?.message);

	// Focus on error when it appears
	useEffect(() => {
		if (isActionError) {
			errorRef.current?.focus();
		}
	}, [state?.message, state?.status, isActionError]);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
	});

	return (
		<ErrorShake shake={shake} intensity={6} onShakeComplete={onShakeComplete}>
			<form action={action} className="space-y-6" onSubmit={() => form.handleSubmit()}>
				<RequiredFieldsNote />

				{state?.message && state.status !== ActionStatus.VALIDATION_ERROR && (
					<>
						{state.status === ActionStatus.SUCCESS ? (
							<Alert role="status" aria-live="polite">
								<CheckCircle2 aria-hidden="true" />
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
								<AlertCircle aria-hidden="true" />
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}
					</>
				)}

				<div className="space-y-4">
					<form.AppField
						name="name"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le prénom est requis";
								if (value.length < 2) {
									return "Le prénom doit contenir au moins 2 caractères";
								}
								if (value.length > 100) {
									return "Le prénom ne doit pas dépasser 100 caractères";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Prénom"
								type="text"
								autoComplete="given-name"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

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
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

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
							<div className="space-y-2">
								<field.PasswordInputField
									label="Mot de passe"
									autoComplete="new-password"
									disabled={isPending}
									required
								/>
								<form.Subscribe selector={(state) => state.values.password}>
									{(password) => <PasswordStrengthIndicator password={password} />}
								</form.Subscribe>
							</div>
						)}
					</form.AppField>
				</div>

				<p className="text-muted-foreground text-xs">
					En vous inscrivant, vous acceptez les{" "}
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
					.
				</p>

				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button disabled={!canSubmit || isPending} className="w-full" type="submit">
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
									Inscription en cours...
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
