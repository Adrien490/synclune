"use client";

import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUpdateProfile } from "@/modules/users/hooks/use-update-profile";
import { EmailChangeForm } from "@/modules/users/components/email-change-form";
import type { GetCurrentUserReturn } from "@/modules/users/types/current-user.types";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
	user: GetCurrentUserReturn;
}

export function ProfileForm({ user }: ProfileFormProps) {
	const router = useRouter();
	const { state, action, isPending } = useUpdateProfile({
		onSuccess: () => {
			router.refresh();
		},
	});

	const form = useAppForm({
		defaultValues: {
			name: user?.name ?? "",
		},
		transform: useTransform((baseForm) => mergeForm(baseForm, (state as unknown) ?? {}), [state]),
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus de `updateProfileSchema` serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "ProfileForm",
	});

	return (
		<div className="space-y-6">
			<form ref={formRef} action={action} onSubmit={handleGatedSubmit} className="space-y-4">
				<FormServerErrorAlert errors={serverErrors} />

				<RequiredFieldsNote />

				<form.AppField
					name="name"
					validators={{
						onChange: ({ value }) => {
							if (!value || value.length < 2) {
								return "Le prénom doit contenir au moins 2 caractères";
							}
							if (value.length > 100) {
								return "Le prénom ne peut pas dépasser 100 caractères";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Prénom"
							disabled={isPending}
							required
							autoComplete="given-name"
							autoCapitalize="words"
							autoCorrect="off"
							enterKeyHint="done"
						/>
					)}
				</form.AppField>

				<form.Subscribe selector={(s) => [s.canSubmit]}>
					{([canSubmit]) => (
						<Button type="submit" disabled={!canSubmit || isPending}>
							{isPending ? "Enregistrement…" : "Enregistrer les modifications"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="border-border/60 space-y-3 border-t pt-4">
				<p className="text-sm font-medium">Adresse email</p>
				<div className="space-y-2">
					<Label htmlFor="email" className="text-muted-foreground text-xs">
						Email actuel
					</Label>
					<Input id="email" type="email" value={user?.email ?? ""} disabled />
				</div>

				<EmailChangeForm />
			</div>
		</div>
	);
}
