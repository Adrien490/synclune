"use client";

import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
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

			<RequiredFieldsNote />

			<form.AppField
				name="newEmail"
				validators={{
					// SSOT : `emailSchema` (même validation que le serveur, trim/lowercase).
					onChange: ({ value }: { value: string }) => {
						// Champ obligatoire : sans ça, `canSubmit` restait vrai à vide et le
						// formulaire faisait un aller-retour serveur pour rien.
						if (!value) return "Le nouvel email est requis";
						const parsed = emailSchema.safeParse(value);
						return parsed.success ? undefined : parsed.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<field.InputField
						label="Nouvel email"
						type="email"
						required
						disabled={isPending}
						// `off`, PAS `email` : il n'existe aucun jeton standard pour « nouvel
						// email », et `email` fait proposer par le trousseau l'adresse
						// ACTUELLE — la seule valeur garantie invalide sur ce champ.
						autoComplete="off"
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

			<form.AppForm>
				<form.SubmitButton
					isPending={isPending}
					idleLabel="Modifier l'email"
					pendingLabel="Envoi…"
					variant="outline"
					size="sm"
				/>
			</form.AppForm>
		</form>
	);
}
