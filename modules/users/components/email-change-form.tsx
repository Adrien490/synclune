"use client";

import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Button } from "@/shared/components/ui/button";
import { useRequestEmailChange } from "@/modules/users/hooks/use-request-email-change";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { emailSchema } from "@/shared/schemas/email.schemas";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";

export function EmailChangeForm() {
	const { state, action, isPending } = useRequestEmailChange();

	const form = useAppForm({
		defaultValues: {
			newEmail: "",
		},
		transform: useTransform((baseForm) => mergeForm(baseForm, (state as unknown) ?? {}), [state]),
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un email refusé côté serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "EmailChangeForm",
	});

	return (
		<form ref={formRef} action={action} onSubmit={handleGatedSubmit} className="space-y-3">
			<FormServerErrorAlert errors={serverErrors} />

			<form.AppField
				name="newEmail"
				validators={{
					// SSOT : `emailSchema` (même validation que le serveur, trim/lowercase).
					// Champ facultatif tant qu'il est vide — on ne valide qu'une saisie amorcée.
					onChange: ({ value }: { value: string }) => {
						if (!value) return undefined;
						const parsed = emailSchema.safeParse(value);
						return parsed.success ? undefined : parsed.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<field.InputField
						label="Nouvel email"
						type="email"
						disabled={isPending}
						autoComplete="email"
						inputMode="email"
						enterKeyHint="send"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						placeholder="nouvelle@adresse.com"
					/>
				)}
			</form.AppField>

			<p className="text-muted-foreground text-xs">
				Un email de confirmation sera envoyé à la nouvelle adresse. Le changement ne sera effectif
				qu&apos;après validation depuis ce lien.
			</p>

			<form.Subscribe selector={(s) => [s.canSubmit]}>
				{([canSubmit]) => (
					<Button type="submit" variant="outline" size="sm" disabled={!canSubmit || isPending}>
						{isPending ? "Envoi…" : "Modifier l'email"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
