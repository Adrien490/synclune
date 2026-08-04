"use client";

import { useAppForm } from "@/shared/components/forms";
import { emailSchema } from "@/shared/schemas/email.schemas";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { ErrorShake } from "@/shared/components/animations/error-shake";
import { useFormErrorShake } from "@/modules/auth/hooks/use-form-error-shake";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useResendCooldown } from "@/modules/auth/hooks/use-resend-cooldown";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useRequestPasswordReset } from "@/modules/auth/hooks/use-request-password-reset";
import { useEffect, useRef } from "react";

export function RequestPasswordResetForm() {
	const { action, isPending, state } = useRequestPasswordReset();
	const errorRef = useRef<HTMLDivElement>(null);
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	const isActionError =
		!!state?.message &&
		state.status !== ActionStatus.SUCCESS &&
		state.status !== ActionStatus.INITIAL &&
		state.status !== ActionStatus.VALIDATION_ERROR;

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

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
		},
	});

	const {
		remainingSeconds,
		isCoolingDown,
		start: startCooldown,
	} = useResendCooldown({
		storageKey: "password-reset-cooldown",
	});

	// Start cooldown on success (anti-spam aligned with AUTH_RATE_LIMIT_RULES: 3/min)
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			startCooldown();
		}
	}, [state?.status, startCooldown]);

	// Le gate ci-dessous empêche toute soumission client invalide : une
	// VALIDATION_ERROR serveur signale donc une divergence client/serveur réelle et
	// doit rester visible (elle est exclue du toast ET de l'alerte ci-dessus).
	const serverErrors = useServerFieldErrors({ state });

	// Gate de soumission : rien ne part au serveur tant que le client est invalide
	// (sinon chaque faute de frappe consommerait une tentative de rate limit) et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "RequestPasswordResetForm",
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

				<FormServerErrorAlert errors={serverErrors} />

				{/* Message de succès */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert role="status" aria-live="polite">
						<CheckCircleIcon aria-hidden="true" />
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
							<XCircleIcon aria-hidden="true" />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}

				<FieldSet>
					<FieldGroup>
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
							{state?.status === ActionStatus.SUCCESS ? (
								"Email envoyé"
							) : isPending ? (
								<>
									<Spinner presentational />
									<span>Envoi en cours…</span>
								</>
							) : isCoolingDown ? (
								`Renvoyer dans ${remainingSeconds}s`
							) : (
								"Envoyer le lien de réinitialisation"
							)}
						</Button>
					)}
				</form.Subscribe>

				{/* SR-only announcement for cooldown countdown (polite, non-intrusive) */}
				{isCoolingDown && !isPending && state?.status !== ActionStatus.SUCCESS && (
					<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
						Veuillez patienter {remainingSeconds} secondes avant de renvoyer le lien.
					</span>
				)}
			</form>
		</ErrorShake>
	);
}
