"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
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
import {
	Archive,
	ArchiveRestore,
	FileEdit,
	Globe,
	MoreVertical,
	Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useBulkArchiveCollections } from "@/modules/collections/hooks/use-bulk-archive-collections";
import { BULK_DELETE_COLLECTIONS_DIALOG_ID } from "./bulk-delete-collections-alert-dialog";
import { BULK_ARCHIVE_COLLECTIONS_DIALOG_ID } from "./bulk-archive-collections-alert-dialog";

interface CollectionsSelectionToolbarProps {
	collections: Array<{
		id: string;
		name: string;
		status: CollectionStatus;
		productsCount: number;
	}>;
}

export function CollectionsSelectionToolbar({
	collections,
}: CollectionsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_COLLECTIONS_DIALOG_ID);
	const bulkArchiveDialog = useAlertDialog(BULK_ARCHIVE_COLLECTIONS_DIALOG_ID);

	const { handle: bulkChangeStatus, isPending: isChangingStatus } =
		useBulkArchiveCollections({
			onSuccess: () => clearSelection(),
		});

	// Determiner le statut des collections selectionnees
	const selectedCollectionsStatus = useMemo(() => {
		const selectedCollections = collections.filter((c) =>
			selectedItems.includes(c.id)
		);

		if (selectedCollections.length === 0) {
			return {
				allArchived: false,
				hasArchived: false,
				hasNonArchived: false,
				allDraft: false,
				allPublic: false,
				hasMixedStatus: false,
			};
		}

		const allArchived = selectedCollections.every(
			(c) => c.status === CollectionStatus.ARCHIVED
		);
		const hasArchived = selectedCollections.some(
			(c) => c.status === CollectionStatus.ARCHIVED
		);
		const hasNonArchived = selectedCollections.some(
			(c) => c.status !== CollectionStatus.ARCHIVED
		);
		const allDraft = selectedCollections.every(
			(c) => c.status === CollectionStatus.DRAFT
		);
		const allPublic = selectedCollections.every(
			(c) => c.status === CollectionStatus.PUBLIC
		);
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
	}, [collections, selectedItems]);

	const handleBulkArchive = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}

		bulkArchiveDialog.open({
			collectionIds: selectedItems,
			targetStatus: CollectionStatus.ARCHIVED,
		});
	};

	const handleBulkRestore = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}

		bulkArchiveDialog.open({
			collectionIds: selectedItems,
			targetStatus: CollectionStatus.PUBLIC,
		});
	};

	const handleBulkDelete = () => {
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

	const handlePublish = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}

		bulkChangeStatus(selectedItems, CollectionStatus.PUBLIC);
	};

	const handleUnpublish = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}

		bulkChangeStatus(selectedItems, CollectionStatus.DRAFT);
	};

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} collection{selectedItems.length > 1 ? "s" : ""}{" "}
				selectionnee
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
					{/* Actions de changement de statut (DRAFT/PUBLIC) */}
					{!selectedCollectionsStatus.allArchived &&
						!selectedCollectionsStatus.hasArchived && (
							<>
								{selectedCollectionsStatus.allDraft && (
									<DropdownMenuItem
										onClick={handlePublish}
										disabled={isChangingStatus}
									>
										<Globe className="h-4 w-4" />
										Publier
									</DropdownMenuItem>
								)}
								{selectedCollectionsStatus.allPublic && (
									<DropdownMenuItem
										onClick={handleUnpublish}
										disabled={isChangingStatus}
									>
										<FileEdit className="h-4 w-4" />
										Mettre en brouillon
									</DropdownMenuItem>
								)}
								{selectedCollectionsStatus.hasMixedStatus && (
									<>
										<DropdownMenuItem
											onClick={handlePublish}
											disabled={isChangingStatus}
										>
											<Globe className="h-4 w-4" />
											Publier
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={handleUnpublish}
											disabled={isChangingStatus}
										>
											<FileEdit className="h-4 w-4" />
											Mettre en brouillon
										</DropdownMenuItem>
									</>
								)}

								<DropdownMenuSeparator />
							</>
						)}

					{/* Actions conditionnelles selon le statut archive */}
					{selectedCollectionsStatus.allArchived ? (
						<>
							{/* Tous archives : Restaurer + Supprimer */}
							<DropdownMenuItem onClick={handleBulkRestore}>
								<ArchiveRestore className="h-4 w-4" />
								Restaurer
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={handleBulkDelete}
								variant="destructive"
							>
								<Trash2 className="h-4 w-4" />
								Supprimer
							</DropdownMenuItem>
						</>
					) : selectedCollectionsStatus.hasArchived ? (
						<>
							{/* Mix archive/non-archive : Message d'erreur */}
							<DropdownMenuItem
								disabled
								className="text-muted-foreground cursor-not-allowed"
							>
								Selection mixte archive/non-archive
							</DropdownMenuItem>
						</>
					) : (
						<>
							{/* Tous non-archives : Archiver */}
							<DropdownMenuItem onClick={handleBulkArchive}>
								<Archive className="h-4 w-4" />
								Archiver
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
