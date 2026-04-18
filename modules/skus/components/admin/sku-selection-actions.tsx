"use client";

import {
	CircleCheck,
	CircleX,
	DollarSign,
	EllipsisVertical,
	FileDown,
	LoaderCircle,
	Package,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/shared/utils/toast";

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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useBulkActivateSkus } from "@/modules/skus/hooks/use-bulk-activate-skus";
import { useBulkDeactivateSkus } from "@/modules/skus/hooks/use-bulk-deactivate-skus";
import { useBulkDeleteSkus } from "@/modules/skus/hooks/use-bulk-delete-skus";

import { BULK_ADJUST_STOCK_DIALOG_ID } from "./bulk-adjust-stock-dialog";
import { BULK_UPDATE_PRICE_DIALOG_ID } from "./bulk-update-price-dialog";

export function ProductVariantSelectionActions() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const bulkAdjustStockDialog = useDialog(BULK_ADJUST_STOCK_DIALOG_ID);
	const bulkUpdatePriceDialog = useDialog(BULK_UPDATE_PRICE_DIALOG_ID);

	const { activateSkus, isPending: isActivating } = useBulkActivateSkus({
		onSuccess: () => clearSelection(),
	});

	const { deactivateSkus, isPending: isDeactivating } = useBulkDeactivateSkus({
		onSuccess: () => clearSelection(),
	});

	const { deleteSkus, isPending: isDeleting } = useBulkDeleteSkus({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const requireSelection = (action: () => void) => () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		action();
	};

	if (selectedItems.length === 0) return null;

	const sections: ActionMenuSection[] = [
		{
			key: "export",
			items: [
				{
					key: "export-csv",
					label: "Exporter CSV",
					icon: FileDown,
					onSelect: requireSelection(() => toast.info("Export CSV non implémenté")),
				},
			],
		},
		{
			key: "inventory",
			label: "Inventaire",
			items: [
				{
					key: "adjust-stock",
					label: "Ajuster le stock",
					icon: Package,
					onSelect: requireSelection(() => bulkAdjustStockDialog.open({ skuIds: selectedItems })),
				},
				{
					key: "update-price",
					label: "Modifier le prix",
					icon: DollarSign,
					onSelect: requireSelection(() => bulkUpdatePriceDialog.open({ skuIds: selectedItems })),
				},
			],
		},
		{
			key: "status",
			items: [
				{
					key: "activate",
					label: "Activer",
					icon: CircleCheck,
					disabled: isActivating,
					onSelect: requireSelection(() => activateSkus(selectedItems)),
				},
				{
					key: "deactivate",
					label: "Désactiver",
					icon: CircleX,
					disabled: isDeactivating,
					onSelect: requireSelection(() => deactivateSkus(selectedItems)),
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
					onSelect: requireSelection(() => setDeleteDialogOpen(true)),
				},
			],
		},
	];

	const label = `${selectedItems.length} variante${selectedItems.length > 1 ? "s" : ""} sélectionnée${selectedItems.length > 1 ? "s" : ""}`;

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

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer les variantes</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer{" "}
							<span className="font-semibold">
								{selectedItems.length} variante
								{selectedItems.length > 1 ? "s" : ""}
							</span>{" "}
							?
							<br />
							<br />
							<span className="text-destructive font-medium">
								Cette action est irréversible. Les variantes par défaut ne peuvent pas être
								supprimées.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
						<Button onClick={() => deleteSkus(selectedItems)} disabled={isDeleting}>
							{isDeleting ? (
								<>
									<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
									Suppression...
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									Supprimer
								</>
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
