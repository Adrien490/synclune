"use client";

import { useActionState, useEffect } from "react";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
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

	const [, formAction] = useActionState(
		withCallbacks(
			reopenStore,
			createToastCallbacks({
				loadingMessage: "Réouverture de la boutique…",
				onSuccess: () => {
					dialog.close();
				},
			}),
		),
		undefined,
	);

	useEffect(() => {
		if (!dialog.isOpen && previousFocusRef.current) {
			const target = previousFocusRef.current;
			requestAnimationFrame(() => target.focus({ preventScroll: true }));
		}
	}, [dialog.isOpen, previousFocusRef]);

	const reopensAtFormatted = reopensAt ? reopensAtFormatter.format(new Date(reopensAt)) : null;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={formAction}
			tone="success"
			title="Réouvrir la boutique"
			confirmLabel="Réouvrir la boutique"
			cancelClassName="min-h-11 transition-transform duration-150 active:scale-[0.98]"
			confirmClassName="min-h-11 transition-transform duration-150 active:scale-[0.98]"
			// Sans ce `style`, la view transition du bandeau de statut meurt en silence.
			confirmStyle={{ viewTransitionName: "store-status-action" }}
			description={
				<>
					Les clients pourront à nouveau passer des commandes immédiatement.
					{reopensAtFormatted ? (
						<span className="text-foreground mt-2 block text-sm">
							La réouverture programmée du <strong>{reopensAtFormatted}</strong> sera également
							annulée.
						</span>
					) : null}
				</>
			}
		/>
	);
}
