"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useMarkAsReturned } from "@/modules/orders/hooks/use-mark-as-returned";
import { LoaderCircle, RotateCcw, Undo2 } from "lucide-react";
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
			<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="info">
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={RotateCcw} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Commande retournée</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									La commande <strong>{dialog.data.orderNumber}</strong> a été marquée comme
									retournée.
								</p>
								<p className="mt-2">Souhaitez-vous créer un remboursement pour cette commande ?</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel onClick={() => dialog.close()}>
							Plus tard
						</ResponsiveAlertDialogCancel>
						<Button asChild>
							<Link
								href={`/admin/ventes/remboursements/nouveau?orderId=${dialog.data.orderId}`}
								onClick={() => dialog.close()}
							>
								Créer un remboursement
							</Link>
						</Button>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		);
	}

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="warning">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeroIcon icon={Undo2} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Marquer comme retourné</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme retournée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut de livraison passera à "Retourné". Vous pourrez ensuite créer un
									remboursement si nécessaire.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Marquage…" : "Marquer comme retourné"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
