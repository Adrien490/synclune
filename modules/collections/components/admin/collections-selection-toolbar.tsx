"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BULK_DELETE_COLLECTIONS_DIALOG_ID } from "./bulk-delete-collections-alert-dialog";

interface CollectionsSelectionToolbarProps {
	collectionIds: string[];
	collections: Array<{
		id: string;
		name: string;
		productsCount: number;
	}>;
}

export function CollectionsSelectionToolbar({
	collections,
}: CollectionsSelectionToolbarProps) {
	const { selectedItems } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_COLLECTIONS_DIALOG_ID);

	const handleDelete = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}

		// Calculate total products count from selected collections
		const selectedCollections = collections.filter((c) =>
			selectedItems.includes(c.id)
		);
		const totalProductsCount = selectedCollections.reduce(
			(sum, c) => sum + c.productsCount,
			0
		);

		bulkDeleteDialog.open({
			collectionIds: selectedItems,
			totalProductsCount,
		});
	};

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} collection{selectedItems.length > 1 ? "s" : ""}{" "}
				sélectionnée
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
					<DropdownMenuItem onClick={handleDelete} variant="destructive">
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
