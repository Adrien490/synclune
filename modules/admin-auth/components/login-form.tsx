"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { login } from "../actions/login";
import { sanitizeCallbackURL } from "../lib/sanitize-callback-url";

/**
 * Formulaire de connexion admin — un seul champ : le mot de passe
 * (`ADMIN_PASSWORD` en env, décision D3 de docs/MIGRATION-PROMPTS.md).
 */
export function LoginForm({ callbackURL }: { callbackURL?: string }) {
	const router = useRouter();
	const destination = sanitizeCallbackURL(callbackURL);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			login,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: () => {
					// `refresh()` re-résout les Server Components avec le cookie posé
					// (navbar, FAB admin) avant d'atterrir sur le dashboard.
					router.refresh();
					router.push(destination);
				},
			}),
		),
		undefined,
	);

	const errorRef = useRef<HTMLDivElement>(null);
	const isActionError = !!state?.message && state.status !== ActionStatus.SUCCESS;

	useEffect(() => {
		if (isActionError) errorRef.current?.focus();
	}, [state?.message, state?.status, isActionError]);

	const form = useAppForm({
		defaultValues: { password: "" },
	});

	return (
		<form action={action} className="space-y-6">
			{isActionError && state.message && (
				<Alert
					ref={errorRef}
					variant="destructive"
					tabIndex={-1}
					role="alert"
					aria-live="assertive"
				>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			<FieldSet>
				<FieldGroup>
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

			<form.Subscribe selector={(s) => [s.canSubmit]}>
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
		</form>
	);
}
