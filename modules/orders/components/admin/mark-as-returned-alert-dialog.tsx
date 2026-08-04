"use client";

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
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";
import { Spinner } from "@/shared/components/ui/spinner";

export const MARK_AS_RETURNED_DIALOG_ID = "mark-as-returned";

interface MarkAsReturnedData {
	orderId: string;
	orderNumber: string;
	showRefundPrompt?: boolean;
	[key: string]: unknown;
}

export function MarkAsReturnedAlertDialog() {
	const dialog = useAlertDialog<MarkAsReturnedData>(MARK_AS_RETURNED_DIALOG_ID);

	const { action, isPending } = useUpdateOrderStatus("returned", {
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
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Commande retournée</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div />}>
							<p>
								La commande <strong>{dialog.data.orderNumber}</strong> a été marquée comme
								retournée.
							</p>
							{/* Lot 2 S3.3 : le remboursement se fait dans le dashboard Stripe
								    (lien « Rembourser dans Stripe » sur la page commande) — le
								    webhook crée la fiche ici, avec avoir et email automatiques. */}
							<p className="mt-2">
								Si tu veux la rembourser, passe par le dashboard Stripe : la fiche remboursement,
								l&apos;avoir et l&apos;email partiront tout seuls.
							</p>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogAction onClick={() => dialog.close()}>
							Compris
						</ResponsiveAlertDialogAction>
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

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Marquer comme retourné</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div />}>
							<p>
								Êtes-vous sûr de vouloir marquer la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> comme retournée ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Le statut de livraison passera à "Retourné". Vous pourrez ensuite créer un
								remboursement si nécessaire.
							</p>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Marquage…" : "Marquer comme retourné"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
