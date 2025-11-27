"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useSignInEmail } from "@/modules/auth/hooks/use-sign-in-email";

export function SignInEmailForm() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL") || "/";

	const { action, isPending, state } = useSignInEmail();
	const errorRef = useRef<HTMLDivElement>(null);

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

			{/* Error message - Skip validation errors */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.message &&
				state.message !== "Données invalides" && (
					<Alert ref={errorRef} variant="destructive" tabIndex={-1}>
						<AlertDescription>{state.message}</AlertDescription>
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

					{/* Password field - Using pre-bound InputField component */}
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
							<field.InputField
								label="Mot de passe"
								type="password"
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
					>
						Se connecter
					</Button>
				)}
			</form.Subscribe>

			{/* Lien "Mot de passe oublié" */}
			<div className="text-center">
				<Link
					href="/mot-de-passe-oublie"
					className="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Mot de passe oublié ? Pas de panique !
				</Link>
			</div>
		</form>
	);
}
