"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useSignUpEmail } from "@/modules/auth/hooks/use-sign-up-email";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import Link from "next/link";

export function SignUpEmailForm() {
	const { state, action, isPending } = useSignUpEmail({
		onSuccess: (message: string) => {
			form.reset();
		},
	});

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			name: "",
			termsAccepted: false,
		},
	});

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => form.handleSubmit()}
		>
			<RequiredFieldsNote />

			{state?.message && state.status !== ActionStatus.VALIDATION_ERROR && (
				<>
					{state.status === ActionStatus.SUCCESS ? (
						<Alert role="status" aria-live="polite">
							<CheckCircle2 aria-hidden="true" />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					) : (
						<Alert variant="destructive" role="alert" aria-live="assertive">
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
						<div className="space-y-2">
							<field.InputField
								label="Email"
								type="email"
								autoComplete="email"
								disabled={isPending}
								required
							/>
							<p className="text-xs text-muted-foreground">
								Utilise uniquement pour la confirmation de compte et les notifications de commande
							</p>
						</div>
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
						<div className="space-y-3">
							<field.InputField
								label="Mot de passe"
								type="password"
								autoComplete="new-password"
								disabled={isPending}
								required
							/>
							<PasswordStrengthIndicator password={field.state.value} />
						</div>
					)}
				</form.AppField>

				<form.AppField
					name="confirmPassword"
					validators={{
						onChangeListenTo: ["password"],
						onChange: ({ value, fieldApi }) => {
							if (!value) return "La confirmation du mot de passe est requise";
							const password = fieldApi.form.getFieldValue("password");
							if (value !== password) {
								return "Les mots de passe ne correspondent pas";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Confirmer le mot de passe"
							type="password"
							autoComplete="new-password"
							disabled={isPending}
							required
						/>
					)}
				</form.AppField>
			</div>

			{/* Checkbox consentement RGPD */}
			<form.AppField
				name="termsAccepted"
				validators={{
					onChange: ({ value }: { value: boolean }) => {
						if (!value) {
							return "Tu dois accepter les conditions générales et la politique de confidentialité";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<field.CheckboxField
							label={
								<span>
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
								</span>
							}
							required
						/>
					</div>
				)}
			</form.AppField>

			{/* Hidden field pour le formulaire */}
			<form.Subscribe selector={(state) => state.values.termsAccepted}>
				{(termsAccepted) => (
					<input
						type="hidden"
						name="termsAccepted"
						value={termsAccepted ? "true" : "false"}
					/>
				)}
			</form.Subscribe>

			<form.Subscribe selector={(state) => [state.canSubmit]}>
				{([canSubmit]) => (
					<Button
						disabled={!canSubmit || isPending}
						className="w-full"
						type="submit"
					>
						S&apos;inscrire
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
