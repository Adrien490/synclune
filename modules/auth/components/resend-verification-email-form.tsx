"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useResendCooldown } from "@/modules/auth/hooks/use-resend-cooldown";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CircleX, CircleCheck, Mail, LoaderCircle } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";
import { useEffect, useRef } from "react";

interface ResendVerificationEmailFormProps {
	defaultEmail?: string;
}

export function ResendVerificationEmailForm({ defaultEmail }: ResendVerificationEmailFormProps) {
	const { action, isPending, state } = useResendVerificationEmail();
	const errorRef = useRef<HTMLDivElement>(null);
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	const isActionError =
		!!state?.message &&
		state.status !== ActionStatus.SUCCESS &&
		state.status !== ActionStatus.INITIAL &&
		state.status !== ActionStatus.VALIDATION_ERROR;

	const { shake, onShakeComplete } = useFormErrorShake(isActionError, state?.message);

	// Focus error + haptic on error appearance
	useEffect(() => {
		if (isActionError) {
			errorRef.current?.focus();
			triggerHaptic("error");
		}
	}, [state?.message, state?.status, isActionError]);

	// Haptic on success
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			triggerHaptic("success");
		}
	}, [state?.status]);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: defaultEmail ?? "",
		},
	});

	const {
		remainingSeconds,
		isCoolingDown,
		start: startCooldown,
	} = useResendCooldown({
		storageKey: "verify-email-cooldown",
	});

	// Start cooldown on success (anti-spam aligned with AUTH_RATE_LIMIT_RULES: 5/min)
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			startCooldown();
		}
	}, [state?.status, startCooldown]);

	return (
		<ErrorShake shake={shake} intensity={6} onShakeComplete={onShakeComplete}>
			<form
				ref={formRef}
				action={action}
				className="space-y-4"
				onSubmit={async () => {
					triggerHaptic("medium");
					await form.handleSubmit();
					if (!form.state.isValid) {
						focusFirstInvalid();
					}
				}}
			>
				{/* Message de succès */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert role="status" aria-live="polite">
						<CircleCheck aria-hidden="true" />
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
							<CircleX aria-hidden="true" />
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
									enterKeyHint="send"
									autoComplete="email"
									autoCapitalize="none"
									autoCorrect="off"
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
							disabled={
								!canSubmit || isPending || state?.status === ActionStatus.SUCCESS || isCoolingDown
							}
							className="w-full"
							type="submit"
							aria-busy={isPending}
						>
							{isPending ? (
								<LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
							) : (
								<Mail className="size-4" aria-hidden="true" />
							)}
							{isPending
								? "Envoi en cours..."
								: state?.status === ActionStatus.SUCCESS
									? "Email envoyé"
									: isCoolingDown
										? `Renvoyer dans ${remainingSeconds}s`
										: "Renvoyer l'email de vérification"}
						</Button>
					)}
				</form.Subscribe>

				{/* SR-only announcement for cooldown countdown (polite, non-intrusive) */}
				{isCoolingDown && !isPending && state?.status !== ActionStatus.SUCCESS && (
					<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
						Veuillez patienter {remainingSeconds} secondes avant de renvoyer l'email.
					</span>
				)}
			</form>
		</ErrorShake>
	);
}
