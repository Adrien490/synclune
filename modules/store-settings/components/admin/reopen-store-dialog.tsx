"use client";

import { Spinner } from "@/shared/components/ui/spinner";
import { useActionState, useEffect } from "react";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { reopenStore } from "../../actions/reopen-store";
import { APP_TIME_ZONE } from "@/shared/utils/timezone";

export const REOPEN_STORE_DIALOG_ID = "reopen-store";

// `timeZone` explicite : sinon SSR (UTC) ≠ client (Paris) → mismatch d'hydratation.
const reopensAtFormatter = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "long",
	timeStyle: "short",
	timeZone: APP_TIME_ZONE,
});

interface ReopenStoreDialogProps {
	previousFocusRef: React.RefObject<HTMLElement | null>;
	reopensAt?: Date | null;
}

export function ReopenStoreDialog({ previousFocusRef, reopensAt }: ReopenStoreDialogProps) {
	const dialog = useAlertDialog(REOPEN_STORE_DIALOG_ID);

	const [, formAction, isPending] = useActionState(
		withCallbacks(reopenStore, {
			...createToastCallbacks({ loadingMessage: "Réouverture de la boutique…" }),
			onSuccess: (result) => {
				createToastCallbacks({ loadingMessage: "Réouverture de la boutique…" }).onSuccess(result);
				dialog.close();
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

	const reopensAtFormatted = reopensAt ? reopensAtFormatter.format(new Date(reopensAt)) : null;

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="success">
			<ResponsiveAlertDialogContent>
				<form action={formAction}>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Réouvrir la boutique</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Les clients pourront à nouveau passer des commandes immédiatement.
							{reopensAtFormatted ? (
								<span className="text-foreground mt-2 block text-sm">
									La réouverture programmée du <strong>{reopensAtFormatted}</strong> sera également
									annulée.
								</span>
							) : null}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel
							disabled={isPending}
							className="min-h-11 transition-transform duration-150 active:scale-[0.98]"
						>
							Annuler
						</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							className="min-h-11 transition-transform duration-150 active:scale-[0.98]"
							style={{ viewTransitionName: "store-status-action" }}
						>
							{isPending && <Spinner presentational className="mr-2" />}
							{isPending ? "Réouverture…" : "Réouvrir la boutique"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
