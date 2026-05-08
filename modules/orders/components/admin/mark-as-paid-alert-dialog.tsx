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
import { useMarkAsPaid } from "@/modules/orders/hooks/use-mark-as-paid";
import { LoaderCircle } from "lucide-react";

export const MARK_AS_PAID_DIALOG_ID = "mark-as-paid";

interface MarkAsPaidData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsPaidAlertDialog() {
	const dialog = useAlertDialog<MarkAsPaidData>(MARK_AS_PAID_DIALOG_ID);

	const { action, isPending } = useMarkAsPaid({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer le paiement manuel</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme payée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Cette action est utilisée pour les paiements par virement ou chèque. La commande
									passera en statut "En préparation".
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Marquage…" : "Marquer comme payée"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
