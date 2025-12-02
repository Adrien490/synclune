"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBulkMarkAsDelivered } from "@/modules/orders/hooks/use-bulk-mark-as-delivered";
import { useBulkCancelOrders } from "@/modules/orders/hooks/use-bulk-cancel-orders";
import {
	CheckCircle2,
	Loader2,
	MoreVertical as MoreVerticalIcon,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { BULK_DELETE_ORDERS_DIALOG_ID } from "./bulk-delete-orders-alert-dialog";

export function OrderSelectionActions() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_ORDERS_DIALOG_ID);

	const [deliveredDialogOpen, setDeliveredDialogOpen] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

	const { action: markAsDeliveredAction, isPending: isDeliveredPending } = useBulkMarkAsDelivered({
		onSuccess: () => {
			setDeliveredDialogOpen(false);
			clearSelection();
		},
	});

	const { action: cancelOrdersAction, isPending: isCancelPending } = useBulkCancelOrders({
		onSuccess: () => {
			setCancelDialogOpen(false);
			clearSelection();
		},
	});

	const isPending = isDeliveredPending || isCancelPending;

	if (selectedItems.length === 0) return null;

	const handleBulkDelete = () => {
		bulkDeleteDialog.open({
			orderIds: selectedItems,
		});
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVerticalIcon className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-[200px]">
					<DropdownMenuItem onClick={() => setDeliveredDialogOpen(true)}>
						<CheckCircle2 className="h-4 w-4" />
						Marquer livrées
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => setCancelDialogOpen(true)}>
						<XCircle className="h-4 w-4" />
						Annuler
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleBulkDelete}
						variant="destructive"
					>
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Mark as Delivered Dialog */}
			<AlertDialog open={deliveredDialogOpen} onOpenChange={setDeliveredDialogOpen}>
				<AlertDialogContent>
					<form action={markAsDeliveredAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Marquer comme livrées</AlertDialogTitle>
							<AlertDialogDescription>
								Marquer{" "}
								<span className="font-semibold">
									{selectedItems.length} commande{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								comme livrée{selectedItems.length > 1 ? "s" : ""} ?
								<br />
								<br />
								Seules les commandes au statut SHIPPED seront traitées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<AlertDialogAction type="submit" disabled={isPending} onClick={(e) => e.preventDefault()}>
								{isDeliveredPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Mise à jour...
									</>
								) : (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Confirmer
									</>
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Cancel Orders Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<form action={cancelOrdersAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Annuler les commandes</AlertDialogTitle>
							<AlertDialogDescription>
								Annuler{" "}
								<span className="font-semibold">
									{selectedItems.length} commande{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les commandes déjà annulées seront ignorées. Le stock sera restauré pour les commandes en attente de paiement.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Retour
							</AlertDialogCancel>
							<AlertDialogAction
								type="submit"
								disabled={isPending}
								onClick={(e) => e.preventDefault()}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isCancelPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Annulation...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Annuler les commandes
									</>
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
