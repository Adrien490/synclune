"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSignInEmail } from "@/modules/auth/hooks/use-sign-in-email";

export function SignInEmailForm() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL") || "/";

	const { action, isPending, state } = useSignInEmail();
	const errorRef = useRef<HTMLDivElement>(null);

	// Focus sur l'erreur quand elle apparaît (ignore validation errors)
	useEffect(() => {
		if (
			state?.message &&
			state.status !== ActionStatus.SUCCESS &&
			state.status !== ActionStatus.VALIDATION_ERROR
		) {
			errorRef.current?.focus();
		}
	}, [state?.message, state?.status]);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			callbackURL: callbackURL || "/",
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

			{/* Error message - Skip validation errors (handled by field validators) */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.VALIDATION_ERROR &&
				state?.message && (
					<Alert ref={errorRef} variant="destructive" tabIndex={-1} role="alert" aria-live="assertive">
						<AlertDescription>
							{state.message === "EMAIL_NOT_VERIFIED" ? (
								<>
									Votre email n'a pas été vérifié.{" "}
									<Link href="/renvoyer-verification" className="underline font-medium hover:no-underline">
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
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								<span>Connexion...</span>
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
					className="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Mot de passe oublié ?
				</Link>
			</div>
		</form>
	);
}
