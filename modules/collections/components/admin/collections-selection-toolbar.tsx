"use client";

import {
	Archive,
	ArchiveRestore,
	EllipsisVertical,
	FilePenLine,
	Globe,
	Trash2,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBulkArchiveCollections } from "@/modules/collections/hooks/use-bulk-archive-collections";

import { BULK_ARCHIVE_COLLECTIONS_DIALOG_ID } from "./bulk-archive-collections-alert-dialog";
import { BULK_DELETE_COLLECTIONS_DIALOG_ID } from "./bulk-delete-collections-alert-dialog";

interface CollectionsSelectionToolbarProps {
	collections: Array<{
		id: string;
		name: string;
		status: CollectionStatus;
		productsCount: number;
	}>;
	pageItemIds?: string[];
}

export function CollectionsSelectionToolbar({
	collections,
	pageItemIds,
}: CollectionsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_COLLECTIONS_DIALOG_ID);
	const bulkArchiveDialog = useAlertDialog(BULK_ARCHIVE_COLLECTIONS_DIALOG_ID);

	const { handle: bulkChangeStatus, isPending: isChangingStatus } = useBulkArchiveCollections({
		onSuccess: () => clearSelection(),
	});

	const selectedCollections = collections.filter((c) => selectedItems.includes(c.id));

	const status = (() => {
		if (selectedCollections.length === 0) {
			return {
				allArchived: false,
				hasArchived: false,
				allDraft: false,
				allPublic: false,
				hasMixedStatus: false,
			};
		}
		const allArchived = selectedCollections.every((c) => c.status === CollectionStatus.ARCHIVED);
		const hasArchived = selectedCollections.some((c) => c.status === CollectionStatus.ARCHIVED);
		const hasNonArchived = selectedCollections.some((c) => c.status !== CollectionStatus.ARCHIVED);
		const allDraft = selectedCollections.every((c) => c.status === CollectionStatus.DRAFT);
		const allPublic = selectedCollections.every((c) => c.status === CollectionStatus.PUBLIC);
		const hasMixedStatus = !allArchived && !allDraft && !allPublic && hasNonArchived;
		return { allArchived, hasArchived, allDraft, allPublic, hasMixedStatus };
	})();

	const requireSelection = (action: () => void) => () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une collection.");
			return;
		}
		action();
	};

	const handleBulkArchive = requireSelection(() =>
		bulkArchiveDialog.open({
			collectionIds: selectedItems,
			targetStatus: CollectionStatus.ARCHIVED,
		}),
	);
	const handleBulkRestore = requireSelection(() =>
		bulkArchiveDialog.open({
			collectionIds: selectedItems,
			targetStatus: CollectionStatus.PUBLIC,
		}),
	);
	const handleBulkDelete = requireSelection(() => {
		const totalProductsCount = selectedCollections.reduce((sum, c) => sum + c.productsCount, 0);
		bulkDeleteDialog.open({ collectionIds: selectedItems, totalProductsCount });
	});
	const handlePublish = requireSelection(() =>
		bulkChangeStatus(selectedItems, CollectionStatus.PUBLIC),
	);
	const handleUnpublish = requireSelection(() =>
		bulkChangeStatus(selectedItems, CollectionStatus.DRAFT),
	);

	if (selectedItems.length === 0) return null;

	const showStatusSection =
		!status.allArchived &&
		!status.hasArchived &&
		(status.allDraft || status.allPublic || status.hasMixedStatus);

	const sections: ActionMenuSection[] = [
		{
			key: "status",
			label: "Statut",
			items: [
				{
					key: "publish",
					label: "Publier",
					icon: Globe,
					disabled: isChangingStatus,
					hidden: !showStatusSection || !(status.allDraft || status.hasMixedStatus),
					onSelect: handlePublish,
				},
				{
					key: "unpublish",
					label: "Mettre en brouillon",
					icon: FilePenLine,
					disabled: isChangingStatus,
					hidden: !showStatusSection || !(status.allPublic || status.hasMixedStatus),
					onSelect: handleUnpublish,
				},
			],
		},
		{
			key: "archive",
			items: [
				{
					key: "archive",
					label: "Archiver",
					icon: Archive,
					hidden: status.allArchived || status.hasArchived,
					onSelect: handleBulkArchive,
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: ArchiveRestore,
					hidden: !status.allArchived,
					onSelect: handleBulkRestore,
				},
				{
					key: "mixed-warning",
					label: "Sélection mixte archivé/non-archivé",
					description: "Désélectionne les archivées pour continuer",
					disabled: true,
					hidden: !(status.hasArchived && !status.allArchived),
					onSelect: () => {},
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
					hidden: !status.allArchived,
					onSelect: handleBulkDelete,
				},
			],
		},
	];

	const label = `${selectedItems.length} collection${selectedItems.length > 1 ? "s" : ""} sélectionnée${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<SelectionToolbar pageItemIds={pageItemIds}>
			<span className="text-muted-foreground text-sm">{label}</span>
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
		</SelectionToolbar>
	);
}
