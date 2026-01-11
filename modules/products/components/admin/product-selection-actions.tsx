"use client";

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
import {
	Archive,
	ArchiveRestore,
	FileDown,
	FileEdit,
	Globe,
	MoreVertical as MoreVerticalIcon,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useBulkChangeProductStatus } from "@/modules/products/hooks/use-bulk-change-product-status";
import { BULK_ARCHIVE_PRODUCTS_DIALOG_ID } from "./bulk-archive-products-alert-dialog";
import { BULK_DELETE_PRODUCTS_DIALOG_ID } from "./bulk-delete-products-alert-dialog";

interface ProductSelectionActionsProps {
	products: Array<{
		id: string;
		status: "DRAFT" | "PUBLIC" | "ARCHIVED";
	}>;
}

export function ProductSelectionActions({ products }: ProductSelectionActionsProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkArchiveDialog = useAlertDialog(BULK_ARCHIVE_PRODUCTS_DIALOG_ID);
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_PRODUCTS_DIALOG_ID);

	const { changeProductStatus, isPending: isChangingStatus } =
		useBulkChangeProductStatus({
			onSuccess: () => clearSelection(),
		});

	// Déterminer si tous les produits sélectionnés sont archivés
	const selectedProducts = products.filter((p) =>
		selectedItems.includes(p.id)
	);

	const selectedProductsStatus = (() => {
		if (selectedProducts.length === 0) {
			return {
				allArchived: false,
				hasArchived: false,
				hasNonArchived: false,
				allDraft: false,
				allPublic: false,
				hasMixedStatus: false,
			};
		}

		const allArchived = selectedProducts.every((p) => p.status === "ARCHIVED");
		const hasArchived = selectedProducts.some((p) => p.status === "ARCHIVED");
		const hasNonArchived = selectedProducts.some(
			(p) => p.status !== "ARCHIVED"
		);
		const allDraft = selectedProducts.every((p) => p.status === "DRAFT");
		const allPublic = selectedProducts.every((p) => p.status === "PUBLIC");
		const hasMixedStatus =
			!allArchived && !allDraft && !allPublic && hasNonArchived;

		return {
			allArchived,
			hasArchived,
			hasNonArchived,
			allDraft,
			allPublic,
			hasMixedStatus,
		};
	})();

	const handleExportCSV = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}
		toast.info("Export CSV non implémenté");
	};

	const handleBulkArchive = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}

		bulkArchiveDialog.open({
			productIds: selectedItems,
			targetStatus: "ARCHIVED",
		});
	};

	const handleBulkRestore = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}

		bulkArchiveDialog.open({
			productIds: selectedItems,
			targetStatus: "PUBLIC",
		});
	};

	const handleBulkDelete = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}

		bulkDeleteDialog.open({
			productIds: selectedItems,
		});
	};

	const handlePublish = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}

		changeProductStatus(selectedItems, "PUBLIC");
	};

	const handleUnpublish = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}

		changeProductStatus(selectedItems, "DRAFT");
	};

	if (selectedItems.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<span className="sr-only">Ouvrir le menu</span>
					<MoreVerticalIcon className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-50">
				{/* Export CSV - Toujours disponible */}
				<DropdownMenuItem onClick={handleExportCSV}>
					<FileDown className="h-4 w-4" />
					Exporter CSV
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* Actions de changement de statut (DRAFT/PUBLIC) */}
				{!selectedProductsStatus.allArchived && !selectedProductsStatus.hasArchived && (
					<>
						{selectedProductsStatus.allDraft && (
							<DropdownMenuItem onClick={handlePublish} disabled={isChangingStatus}>
								<Globe className="h-4 w-4" />
								Publier
							</DropdownMenuItem>
						)}
						{selectedProductsStatus.allPublic && (
							<DropdownMenuItem onClick={handleUnpublish} disabled={isChangingStatus}>
								<FileEdit className="h-4 w-4" />
								Mettre en brouillon
							</DropdownMenuItem>
						)}
						{selectedProductsStatus.hasMixedStatus && (
							<>
								<DropdownMenuItem onClick={handlePublish} disabled={isChangingStatus}>
									<Globe className="h-4 w-4" />
									Publier
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleUnpublish} disabled={isChangingStatus}>
									<FileEdit className="h-4 w-4" />
									Mettre en brouillon
								</DropdownMenuItem>
							</>
						)}

						<DropdownMenuSeparator />
					</>
				)}

				{/* Actions conditionnelles selon le statut archivé */}
				{selectedProductsStatus.allArchived ? (
					<>
						{/* Tous archivés : Restaurer + Supprimer */}
						<DropdownMenuItem onClick={handleBulkRestore}>
							<ArchiveRestore className="h-4 w-4" />
							Restaurer
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleBulkDelete} variant="destructive">
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</>
				) : selectedProductsStatus.hasArchived ? (
					<>
						{/* Mix archivé/non-archivé : Message d'erreur */}
						<DropdownMenuItem
							disabled
							className="text-muted-foreground cursor-not-allowed"
						>
							Sélection mixte archivé/non-archivé
						</DropdownMenuItem>
					</>
				) : (
					<>
						{/* Tous non-archivés : Archiver */}
						<DropdownMenuItem onClick={handleBulkArchive}>
							<Archive className="h-4 w-4" />
							Archiver
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
