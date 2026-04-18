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
import { buttonVariants } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { cancelScheduledClosure } from "../../actions/cancel-scheduled-closure";

export const CANCEL_SCHEDULED_CLOSURE_DIALOG_ID = "cancel-scheduled-closure";

interface CancelScheduledClosureDialogProps {
	previousFocusRef: React.RefObject<HTMLElement | null>;
}

export function CancelScheduledClosureDialog({
	previousFocusRef,
}: CancelScheduledClosureDialogProps) {
	const dialog = useAlertDialog(CANCEL_SCHEDULED_CLOSURE_DIALOG_ID);

	const [, formAction, isPending] = useActionState(
		withCallbacks(cancelScheduledClosure, {
			...createToastCallbacks({}),
			onSuccess: (result) => {
				createToastCallbacks({}).onSuccess(result);
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
						<AlertDialogTitle>Annuler la fermeture programmée ?</AlertDialogTitle>
						<AlertDialogDescription>
							La boutique restera ouverte. Vous pourrez programmer une nouvelle fermeture à tout
							moment.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending} className="min-h-11">
							Conserver
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							onClick={() => triggerHaptic("selection")}
							className={buttonVariants({ variant: "destructive", className: "min-h-11" })}
						>
							{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
							{isPending ? "Annulation..." : "Annuler la programmation"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
