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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteOrders } from "@/modules/orders/hooks/use-bulk-delete-orders";
import { Loader2 } from "lucide-react";

export const BULK_DELETE_ORDERS_DIALOG_ID = "bulk-delete-orders";

interface BulkDeleteOrdersData {
	orderIds: string[];
	[key: string]: unknown;
}

export function BulkDeleteOrdersAlertDialog() {
	const bulkDeleteDialog = useAlertDialog<BulkDeleteOrdersData>(
		BULK_DELETE_ORDERS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { deleteOrders, isPending } = useBulkDeleteOrders({
		onSuccess: () => {
			clearSelection();
			bulkDeleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			bulkDeleteDialog.close();
		}
	};

	const handleDelete = () => {
		if (bulkDeleteDialog.data?.orderIds) {
			deleteOrders(bulkDeleteDialog.data.orderIds);
		}
	};

	const count = bulkDeleteDialog.data?.orderIds?.length ?? 0;

	return (
		<AlertDialog
			open={bulkDeleteDialog.isOpen}
			onOpenChange={handleOpenChange}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Êtes-vous sûr de vouloir supprimer{" "}
								<strong>
									{count} commande{count > 1 ? "s" : ""}
								</strong>{" "}
								?
							</p>
							<p className="text-destructive mt-2 font-medium">
								Cette action est irréversible.
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Note: Seules les commandes éligibles seront supprimées (sans
								facture et non payées). Les autres seront ignorées.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button" disabled={isPending}>
						Annuler
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending ? "Suppression..." : "Supprimer"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
