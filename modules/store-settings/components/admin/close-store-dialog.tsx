"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { buttonVariants } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { closeStore } from "../../actions/close-store";

export const CLOSE_STORE_DIALOG_ID = "close-store";

interface CloseStoreDialogProps {
	previousFocusRef: React.RefObject<HTMLElement | null>;
}

export function CloseStoreDialog({ previousFocusRef }: CloseStoreDialogProps) {
	const dialog = useAlertDialog(CLOSE_STORE_DIALOG_ID);
	const formRef = useRef<HTMLFormElement>(null);

	const form = useAppForm({
		defaultValues: { closureMessage: "", reopensAt: "" },
	});

	const [, formAction, isPending] = useActionState(
		withCallbacks(closeStore, {
			...createToastCallbacks({}),
			onSuccess: (result) => {
				createToastCallbacks({}).onSuccess(result);
				dialog.close();
				form.reset();
			},
		}),
		undefined,
	);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	useEffect(() => {
		if (!dialog.isOpen && previousFocusRef.current) {
			const target = previousFocusRef.current;
			requestAnimationFrame(() => target.focus({ preventScroll: true }));
		}
	}, [dialog.isOpen, previousFocusRef]);

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form ref={formRef} action={formAction} className="space-y-4">
					<AlertDialogHeader>
						<AlertDialogTitle>Fermer la boutique</AlertDialogTitle>
						<AlertDialogDescription>
							Les clients ne pourront plus passer de commandes tant que la boutique sera fermée.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-4">
						<form.AppField name="closureMessage">
							{(field) => (
								<field.TextareaField
									label="Message affiché aux clients"
									placeholder="La boutique est temporairement fermée pour maintenance..."
									maxLength={500}
									showCounter
									rows={3}
									required
									disabled={isPending}
								/>
							)}
						</form.AppField>

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
							<AlertDialogFooter>
								<AlertDialogCancel type="button" disabled={isPending} className="min-h-11">
									Annuler
								</AlertDialogCancel>
								<AlertDialogAction
									type="submit"
									disabled={isPending || !closureMessage.trim()}
									aria-busy={isPending}
									onClick={() => triggerHaptic("medium")}
									className={buttonVariants({ variant: "destructive", className: "min-h-11" })}
								>
									{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
									{isPending ? "Fermeture..." : "Fermer la boutique"}
								</AlertDialogAction>
							</AlertDialogFooter>
						)}
					</form.Subscribe>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
