"use client";

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
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useMarkAsReturned } from "@/modules/orders/hooks/use-mark-as-returned";
import { Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";

export const MARK_AS_RETURNED_DIALOG_ID = "mark-as-returned";

interface MarkAsReturnedData {
	orderId: string;
	orderNumber: string;
	showRefundPrompt?: boolean;
	[key: string]: unknown;
}

export function MarkAsReturnedAlertDialog() {
	const dialog = useAlertDialog<MarkAsReturnedData>(MARK_AS_RETURNED_DIALOG_ID);

	const { action, isPending } = useMarkAsReturned({
		onSuccess: () => {
			dialog.open({ ...dialog.data!, showRefundPrompt: true });
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	if (dialog.data?.showRefundPrompt) {
		return (
			<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<RotateCcw className="h-5 w-5" />
							Commande retournée
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									La commande <strong>{dialog.data?.orderNumber}</strong> a été
									marquée comme retournée.
								</p>
								<p className="mt-2">
									Souhaitez-vous créer un remboursement pour cette commande ?
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" onClick={() => dialog.close()}>
							Plus tard
						</AlertDialogCancel>
						<Button asChild>
							<Link
								href={`/admin/ventes/remboursements/nouveau?orderId=${dialog.data?.orderId}`}
								onClick={() => dialog.close()}
							>
								Créer un remboursement
							</Link>
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Marquer comme retourné</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme retournée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut de livraison passera à "Retourné". Vous pourrez ensuite
									créer un remboursement si nécessaire.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? "Marquage..." : "Marquer comme retourné"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
