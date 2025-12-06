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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useBulkActivateSkus } from "@/modules/skus/hooks/use-bulk-activate-skus";
import { useBulkDeactivateSkus } from "@/modules/skus/hooks/use-bulk-deactivate-skus";
import { useBulkDeleteSkus } from "@/modules/skus/hooks/use-bulk-delete-skus";
import { BULK_ADJUST_STOCK_DIALOG_ID } from "./bulk-adjust-stock-dialog";
import { BULK_UPDATE_PRICE_DIALOG_ID } from "./bulk-update-price-dialog";
import {
	CheckCircle,
	DollarSign,
	FileDown,
	Loader2,
	MoreVertical as MoreVerticalIcon,
	Package,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProductVariantSelectionActions() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	// Dialog hooks (Zustand)
	const bulkAdjustStockDialog = useDialog(BULK_ADJUST_STOCK_DIALOG_ID);
	const bulkUpdatePriceDialog = useDialog(BULK_UPDATE_PRICE_DIALOG_ID);

	const { activateSkus, isPending: isActivating } = useBulkActivateSkus({
		onSuccess: () => {
			clearSelection();
		},
	});

	const { deactivateSkus, isPending: isDeactivating } = useBulkDeactivateSkus({
		onSuccess: () => {
			clearSelection();
		},
	});

	const { deleteSkus, isPending: isDeleting } = useBulkDeleteSkus({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const handleExportCSV = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		toast.info("Export CSV non implemente");
	};

	const handleActivate = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		activateSkus(selectedItems);
	};

	const handleDeactivate = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		deactivateSkus(selectedItems);
	};

	const handleAdjustStock = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		bulkAdjustStockDialog.open({ skuIds: selectedItems });
	};

	const handleUpdatePrice = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		bulkUpdatePriceDialog.open({ skuIds: selectedItems });
	};

	const handleDeleteClick = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une variante.");
			return;
		}
		setDeleteDialogOpen(true);
	};

	if (selectedItems.length === 0) return null;

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
					<DropdownMenuItem onClick={handleExportCSV}>
						<FileDown className="h-4 w-4" />
						Exporter CSV
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={handleAdjustStock}>
						<Package className="h-4 w-4" />
						Ajuster le stock
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleUpdatePrice}>
						<DollarSign className="h-4 w-4" />
						Modifier le prix
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={handleActivate} disabled={isActivating}>
						<CheckCircle className="h-4 w-4" />
						Activer
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleDeactivate} disabled={isDeactivating}>
						<XCircle className="h-4 w-4" />
						Desactiver
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer les variantes</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr(e) de vouloir supprimer{" "}
							<span className="font-semibold">
								{selectedItems.length} variante
								{selectedItems.length > 1 ? "s" : ""}
							</span>{" "}
							?
							<br />
							<br />
							<span className="text-destructive font-medium">
								Cette action est irreversible. Les variantes par defaut ne peuvent pas etre supprimees.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								deleteSkus(selectedItems);
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									Supprimer
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
