"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { XCircle, CheckCircle2, Mail, Loader2 } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";
import { useEffect, useRef } from "react";

interface ResendVerificationEmailFormProps {
	defaultEmail?: string;
}

export function ResendVerificationEmailForm({ defaultEmail }: ResendVerificationEmailFormProps) {
	const { action, isPending, state } = useResendVerificationEmail();
	const errorRef = useRef<HTMLDivElement>(null);

	const isActionError =
		!!state?.message &&
		state.status !== ActionStatus.SUCCESS &&
		state.status !== ActionStatus.INITIAL &&
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
			email: defaultEmail ?? "",
		},
	});

	return (
		<ErrorShake shake={shake} intensity={6} onShakeComplete={onShakeComplete}>
			<form action={action} className="space-y-4" onSubmit={() => form.handleSubmit()}>
				{/* Message de succès */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert role="status" aria-live="polite">
						<CheckCircle2 aria-hidden="true" />
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

				{/* Message d'erreur (ignore validation errors - handled by field validators) */}
				{state?.status !== ActionStatus.SUCCESS &&
					state?.status !== ActionStatus.INITIAL &&
					state?.status !== ActionStatus.VALIDATION_ERROR &&
					state?.message && (
						<Alert
							ref={errorRef}
							variant="destructive"
							tabIndex={-1}
							role="alert"
							aria-live="assertive"
						>
							<XCircle aria-hidden="true" />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}

				<FieldSet>
					<FieldGroup>
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
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
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
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
							) : (
								<Mail className="h-4 w-4" aria-hidden="true" />
							)}
							{isPending
								? "Envoi en cours..."
								: state?.status === ActionStatus.SUCCESS
									? "Email envoyé"
									: "Renvoyer l'email de vérification"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</ErrorShake>
	);
}
