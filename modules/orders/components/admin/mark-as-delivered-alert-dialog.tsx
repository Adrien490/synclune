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
import { useMarkAsDelivered } from "@/modules/orders/hooks/use-mark-as-delivered";
import { LoaderCircle } from "lucide-react";

export const MARK_AS_DELIVERED_DIALOG_ID = "mark-as-delivered";

interface MarkAsDeliveredData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsDeliveredAlertDialog() {
	const dialog = useAlertDialog<MarkAsDeliveredData>(MARK_AS_DELIVERED_DIALOG_ID);

	const { action, isPending } = useMarkAsDelivered({
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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="success">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la livraison</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme livrée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Cette action force le statut si le webhook du transporteur ne fonctionne pas. La
									date de livraison sera enregistrée.
								</p>
								<p className="text-muted-foreground mt-2 text-sm">
									Une demande d&apos;avis sera automatiquement envoyée au client 7 jours après cette
									action.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Mise à jour…" : "Marquer comme livrée"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
