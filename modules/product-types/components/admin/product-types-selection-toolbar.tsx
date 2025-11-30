"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBulkActivateProductTypes } from "@/modules/product-types/hooks/use-bulk-activate-product-types";
import { useBulkDeactivateProductTypes } from "@/modules/product-types/hooks/use-bulk-deactivate-product-types";
import { BULK_DELETE_PRODUCT_TYPES_DIALOG_ID } from "./bulk-delete-product-types-alert-dialog";
import { CheckCircle2, MoreVertical, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ProductTypesSelectionToolbarProps {
	productTypeIds: string[];
}

export function ProductTypesSelectionToolbar({}: ProductTypesSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_PRODUCT_TYPES_DIALOG_ID);

	const { activateProductTypes, isPending: isActivating } = useBulkActivateProductTypes({
		onSuccess: () => {
			clearSelection();
		},
	});

	const { deactivateProductTypes, isPending: isDeactivating } = useBulkDeactivateProductTypes({
		onSuccess: () => {
			clearSelection();
		},
	});

	const handleActivate = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un type de bijou.");
			return;
		}

		activateProductTypes(selectedItems);
	};

	const handleDeactivate = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un type de bijou.");
			return;
		}

		deactivateProductTypes(selectedItems);
	};

	const handleBulkDelete = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un type de bijou.");
			return;
		}

		bulkDeleteDialog.open({
			productTypeIds: selectedItems,
		});
	};

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} type{selectedItems.length > 1 ? "s" : ""}{" "}
				sélectionné
				{selectedItems.length > 1 ? "s" : ""}
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-[200px]">
					<DropdownMenuItem onClick={handleActivate} disabled={isActivating}>
						<CheckCircle2 className="h-4 w-4" />
						Activer
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDeactivate} disabled={isDeactivating}>
						<XCircle className="h-4 w-4" />
						Désactiver
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleBulkDelete} variant="destructive">
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
