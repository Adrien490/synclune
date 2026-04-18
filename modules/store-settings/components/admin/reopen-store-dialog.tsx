"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";

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
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { reopenStore } from "../../actions/reopen-store";

export const REOPEN_STORE_DIALOG_ID = "reopen-store";

interface ReopenStoreDialogProps {
	previousFocusRef: React.RefObject<HTMLElement | null>;
}

export function ReopenStoreDialog({ previousFocusRef }: ReopenStoreDialogProps) {
	const dialog = useAlertDialog(REOPEN_STORE_DIALOG_ID);

	const [, formAction, isPending] = useActionState(
		withCallbacks(reopenStore, {
			...createToastCallbacks({ loadingMessage: "Réouverture de la boutique..." }),
			onSuccess: (result) => {
				createToastCallbacks({ loadingMessage: "Réouverture de la boutique..." }).onSuccess(result);
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

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={formAction}>
					<AlertDialogHeader>
						<AlertDialogTitle>Réouvrir la boutique</AlertDialogTitle>
						<AlertDialogDescription>
							Les clients pourront à nouveau passer des commandes immédiatement.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending} className="min-h-11">
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							onClick={() => triggerHaptic("light")}
							className="min-h-11"
							style={{ viewTransitionName: "store-status-action" }}
						>
							{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
							{isPending ? "Réouverture..." : "Réouvrir la boutique"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
