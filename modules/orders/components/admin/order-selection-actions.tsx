"use client";

import {
	CircleCheck,
	CircleX,
	EllipsisVertical,
	LoaderCircle,
	Package,
	Trash2,
	Truck,
} from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useBulkCancelOrders } from "@/modules/orders/hooks/use-bulk-cancel-orders";
import { useBulkMarkAsDelivered } from "@/modules/orders/hooks/use-bulk-mark-as-delivered";
import { useBulkMarkAsProcessing } from "@/modules/orders/hooks/use-bulk-mark-as-processing";
import { useBulkMarkAsShipped } from "@/modules/orders/hooks/use-bulk-mark-as-shipped";

import { BULK_DELETE_ORDERS_DIALOG_ID } from "./bulk-delete-orders-alert-dialog";

export function OrderSelectionActions() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_ORDERS_DIALOG_ID);

	const deliveredDialog = useDialog("bulk-mark-delivered");
	const shippedDialog = useDialog("bulk-mark-shipped");
	const cancelDialog = useDialog("bulk-cancel-orders");
	const processingDialog = useDialog("bulk-mark-processing");

	const { action: markAsDeliveredAction, isPending: isDeliveredPending } = useBulkMarkAsDelivered({
		onSuccess: () => {
			deliveredDialog.close();
			clearSelection();
		},
	});

	const { action: cancelOrdersAction, isPending: isCancelPending } = useBulkCancelOrders({
		onSuccess: () => {
			cancelDialog.close();
			clearSelection();
		},
	});

	const { action: markAsProcessingAction, isPending: isProcessingPending } =
		useBulkMarkAsProcessing({
			onSuccess: () => {
				processingDialog.close();
				clearSelection();
			},
		});

	const { action: markAsShippedAction, isPending: isShippedPending } = useBulkMarkAsShipped({
		onSuccess: () => {
			shippedDialog.close();
			clearSelection();
		},
	});

	const isPending =
		isDeliveredPending || isCancelPending || isProcessingPending || isShippedPending;

	if (selectedItems.length === 0) return null;

	const handleBulkDelete = () => {
		bulkDeleteDialog.open({ orderIds: selectedItems });
	};

	const sections: ActionMenuSection[] = [
		{
			key: "fulfillment",
			label: "Fulfillment",
			items: [
				{
					key: "processing",
					label: "Mettre en préparation",
					icon: Package,
					onSelect: () => processingDialog.open(),
				},
				{
					key: "shipped",
					label: "Marquer expédiées",
					icon: Truck,
					onSelect: () => shippedDialog.open(),
				},
				{
					key: "delivered",
					label: "Marquer livrées",
					icon: CircleCheck,
					onSelect: () => deliveredDialog.open(),
				},
			],
		},
		{
			key: "cancel",
			items: [
				{
					key: "cancel",
					label: "Annuler",
					icon: CircleX,
					onSelect: () => cancelDialog.open(),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					onSelect: handleBulkDelete,
				},
			],
		},
	];

	const label = `${selectedItems.length} commande${selectedItems.length > 1 ? "s" : ""} sélectionnée${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
						aria-label="Actions de la sélection"
					>
						<span className="sr-only">Ouvrir le menu</span>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions groupées"
					description={label}
					sections={sections}
				/>
			</ResponsiveActionMenu>

			{/* Mark as Processing Dialog */}
			<AlertDialog
				open={processingDialog.isOpen}
				onOpenChange={(open) => (open ? processingDialog.open() : processingDialog.close())}
			>
				<AlertDialogContent>
					<form action={markAsProcessingAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Mettre en préparation</AlertDialogTitle>
							<AlertDialogDescription>
								Passer{" "}
								<span className="font-semibold">
									{selectedItems.length} commande{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								en cours de préparation ?
								<br />
								<br />
								Seules les commandes en attente avec paiement confirmé seront traitées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isProcessingPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Mise à jour...
									</>
								) : (
									<>
										<Package className="mr-2 h-4 w-4" />
										Confirmer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Mark as Shipped Dialog */}
			<AlertDialog
				open={shippedDialog.isOpen}
				onOpenChange={(open) => (open ? shippedDialog.open() : shippedDialog.close())}
			>
				<AlertDialogContent>
					<form action={markAsShippedAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Marquer comme expédiées</AlertDialogTitle>
							<AlertDialogDescription>
								Marquer{" "}
								<span className="font-semibold">
									{selectedItems.length} commande{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								comme expédiée{selectedItems.length > 1 ? "s" : ""} ?
								<br />
								<br />
								Seules les commandes en cours de préparation avec paiement confirmé seront traitées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isShippedPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Expédition...
									</>
								) : (
									<>
										<Truck className="mr-2 h-4 w-4" />
										Confirmer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Mark as Delivered Dialog */}
			<AlertDialog
				open={deliveredDialog.isOpen}
				onOpenChange={(open) => (open ? deliveredDialog.open() : deliveredDialog.close())}
			>
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
							<Button type="submit" disabled={isPending}>
								{isDeliveredPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Mise à jour...
									</>
								) : (
									<>
										<CircleCheck className="mr-2 h-4 w-4" />
										Confirmer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Cancel Orders Dialog */}
			<AlertDialog
				open={cancelDialog.isOpen}
				onOpenChange={(open) => (open ? cancelDialog.open() : cancelDialog.close())}
			>
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
								Les commandes déjà annulées seront ignorées. Le stock sera restauré pour les
								commandes en attente de paiement.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Retour
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isCancelPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Annulation...
									</>
								) : (
									<>
										<CircleX className="mr-2 h-4 w-4" />
										Annuler les commandes
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
