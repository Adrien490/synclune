"use client";

import { LoaderCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { closeStore } from "../../actions/close-store";

export function CloseStoreForm() {
	const router = useRouter();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: { closureMessage: "", reopensAt: "" },
	});

	const [, formAction, isPending] = useActionState(
		withCallbacks(closeStore, {
			...createToastCallbacks({ loadingMessage: "Fermeture de la boutique..." }),
			onSuccess: (result) => {
				createToastCallbacks({ loadingMessage: "Fermeture de la boutique..." }).onSuccess(result);
				form.reset();
				allowNavigation();
				router.push("/admin/configuration/boutique");
			},
		}),
		undefined,
	);

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty && !isPending);

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={() => {
				queueMicrotask(() => {
					focusFirstInvalid();
				});
			}}
			aria-busy={isPending}
			className="space-y-6"
		>
			<p className="text-muted-foreground text-sm">
				Les clients ne pourront plus passer de commandes tant que la boutique sera fermée. Ils
				verront le message ci-dessous sur la page d&apos;accueil et les pages produit.
			</p>

			<form.AppField name="closureMessage">
				{(field) => (
					<field.TextareaField
						label="Message affiché aux clients"
						placeholder="La boutique est temporairement fermée pour maintenance..."
						maxLength={500}
						showCounter
						rows={4}
						required
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
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

			<form.Subscribe selector={(state) => state.values.closureMessage}>
				{(closureMessage) => (
					<div className="flex border-t pt-6 md:justify-end">
						<Button
							type="submit"
							variant="destructive"
							disabled={isPending || !closureMessage.trim()}
							aria-busy={isPending}
							onClick={() => triggerHaptic("medium")}
							className="min-h-11"
							style={{ viewTransitionName: "store-status-action" }}
						>
							{isPending ? (
								<LoaderCircle className="mr-2 size-4 animate-spin" />
							) : (
								<Lock className="mr-2 size-4" />
							)}
							{isPending ? "Fermeture..." : "Fermer la boutique"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
