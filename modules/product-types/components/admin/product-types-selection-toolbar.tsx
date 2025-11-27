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
import { useBulkActivateProductTypes } from "@/modules/product-types/hooks/admin/use-bulk-activate-product-types";
import { useBulkDeactivateProductTypes } from "@/modules/product-types/hooks/admin/use-bulk-deactivate-product-types";
import { CheckCircle, MoreVertical, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ProductTypesSelectionToolbarProps {
	productTypeIds: string[];
}

export function ProductTypesSelectionToolbar({}: ProductTypesSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();

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
						<CheckCircle className="h-4 w-4" />
						Activer
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDeactivate} disabled={isDeactivating}>
						<XCircle className="h-4 w-4" />
						Désactiver
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
