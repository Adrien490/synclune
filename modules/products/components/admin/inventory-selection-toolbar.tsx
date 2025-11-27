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
import {
	Download,
	FileText,
	MoreVertical,
	Printer,
	Settings,
	Tag,
	Unlock,
} from "lucide-react";
import { toast } from "sonner";

interface InventorySelectionToolbarProps {
	inventoryIds: string[];
}

export function InventorySelectionToolbar({}: InventorySelectionToolbarProps) {
	const { selectedItems } = useSelectionContext();

	const handleBulkAdjustment = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Ajustement stock groupé non implémenté");
	};

	const handleReleaseReservations = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Libérer réservations expirées non implémenté");
	};

	const handleGeneratePurchaseOrder = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Génération bon de commande fournisseur non implémentée");
	};

	const handleMarkForRestock = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Marquer pour réassort non implémenté");
	};

	const handleExportStock = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Export état stock (CSV) non implémenté");
	};

	const handlePrintLabels = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un produit.");
			return;
		}
		toast.info("Impression étiquettes stock non implémentée");
	};

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} produit{selectedItems.length > 1 ? "s" : ""}{" "}
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
				<DropdownMenuContent align="end" className="w-[260px]">
					<DropdownMenuItem onClick={handleBulkAdjustment}>
						<Settings className="h-4 w-4" />
						Ajustement stock groupé
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleReleaseReservations}>
						<Unlock className="h-4 w-4" />
						Libérer réservations expirées
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleGeneratePurchaseOrder}>
						<FileText className="h-4 w-4" />
						Générer bon de commande
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleMarkForRestock}>
						<Tag className="h-4 w-4" />
						Marquer pour réassort
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleExportStock}>
						<Download className="h-4 w-4" />
						Exporter état stock (CSV)
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handlePrintLabels}>
						<Printer className="h-4 w-4" />
						Imprimer étiquettes stock
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
