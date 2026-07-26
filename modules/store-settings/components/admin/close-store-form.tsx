"use client";

import { LoaderCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { closeStore } from "../../actions/close-store";

export function CloseStoreForm() {
	const router = useRouter();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: { closureMessage: "", reopensAt: "" },
	});

	const [state, formAction, isPending] = useActionState(
		withCallbacks(closeStore, {
			...createToastCallbacks({ loadingMessage: "Fermeture de la boutique…" }),
			onSuccess: (result) => {
				createToastCallbacks({ loadingMessage: "Fermeture de la boutique…" }).onSuccess(result);
				form.reset();
				allowNavigation();
				router.push("/admin/configuration/boutique");
			},
		}),
		undefined,
	);

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action: formAction,
		isPending,
		focusFirstInvalid,
		context: "CloseStoreForm",
	});

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	// Échap ramène à la configuration boutique (d'où l'on vient), ⌘S soumet — ce
	// formulaire était le seul avec `useUnsavedChanges` mais sans raccourcis.
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: "/admin/configuration/boutique",
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		getCanSubmit: () => form.state.canSubmit,
	});

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={handleGatedSubmit}
			aria-busy={isPending}
			data-pending={isPending ? "true" : undefined}
			className="space-y-4 sm:space-y-6"
		>
			<FormServerErrorAlert errors={serverErrors} />

			<p className="text-muted-foreground text-sm">
				Les clients ne pourront plus passer de commandes tant que la boutique sera fermée. Ils
				verront le message ci-dessous sur la page d&apos;accueil et les pages produit.
			</p>

			<RequiredFieldsNote />

			<form.AppField name="closureMessage">
				{(field) => (
					<field.TextareaField
						label="Message affiché aux clients"
						placeholder="La boutique est temporairement fermée pour maintenance…"
						maxLength={500}
						showCounter
						rows={4}
						required
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
						className="resize-none"
					/>
				)}
			</form.AppField>

			<div className="space-y-2">
				<form.AppField name="reopensAt">
					{(field) => (
						<field.DateTimeField
							label="Date de réouverture automatique"
							placeholder="Sélectionner une date"
							optional
							disabled={isPending}
						/>
					)}
				</form.AppField>
				<p className="text-muted-foreground text-xs">
					Si renseignée, la boutique sera automatiquement réouverte à cette date.
				</p>
			</div>

			<AdminFormFooter pending={isPending} className="mt-2">
				<form.Subscribe selector={(state) => state.values.closureMessage}>
					{(closureMessage) => (
						<div className="flex md:justify-end">
							<Button
								type="submit"
								variant="destructive"
								disabled={isPending || !closureMessage.trim()}
								aria-busy={isPending}
								onClick={() => triggerHaptic("medium")}
								className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:w-auto"
								style={{ viewTransitionName: "store-status-action" }}
							>
								{isPending ? (
									<LoaderCircle className="mr-2 size-4 animate-spin" />
								) : (
									<Lock className="mr-2 size-4" />
								)}
								{isPending ? "Fermeture…" : "Fermer la boutique"}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</AdminFormFooter>
		</form>
	);
}
