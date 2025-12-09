"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useSignUpEmail } from "@/modules/auth/hooks/use-sign-up-email";

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
						<Alert>
							<CheckCircle2 />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					) : (
						<Alert variant="destructive">
							<AlertCircle />
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
								return "Petite erreur de saisie ? Ton email semble invalide 🌸";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Email"
							type="email"
							autoComplete="email"
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
						<field.InputField
							label="Mot de passe"
							type="password"
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
