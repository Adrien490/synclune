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

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBulkChangeProductStatus } from "@/modules/products/hooks/use-bulk-change-product-status";

import { BULK_ARCHIVE_PRODUCTS_DIALOG_ID } from "./bulk-archive-products-alert-dialog";
import { BULK_DELETE_PRODUCTS_DIALOG_ID } from "./bulk-delete-products-alert-dialog";

interface ProductSelectionActionsProps {
	products: Array<{
		id: string;
		status: "DRAFT" | "PUBLIC" | "ARCHIVED";
		title?: string;
	}>;
}

export function ProductSelectionActions({ products }: ProductSelectionActionsProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkArchiveDialog = useAlertDialog(BULK_ARCHIVE_PRODUCTS_DIALOG_ID);
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_PRODUCTS_DIALOG_ID);

	const { changeProductStatus, isPending: isChangingStatus } = useBulkChangeProductStatus({
		onSuccess: () => clearSelection(),
	});

	const selectedProducts = products.filter((p) => selectedItems.includes(p.id));

	const status = (() => {
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
		const hasNonArchived = selectedProducts.some((p) => p.status !== "ARCHIVED");
		const allDraft = selectedProducts.every((p) => p.status === "DRAFT");
		const allPublic = selectedProducts.every((p) => p.status === "PUBLIC");
		const hasMixedStatus = !allArchived && !allDraft && !allPublic && hasNonArchived;

		return { allArchived, hasArchived, hasNonArchived, allDraft, allPublic, hasMixedStatus };
	})();

	const requireSelection = (action: () => void) => () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un bijou.");
			return;
		}
		action();
	};

	const handleBulkArchive = requireSelection(() =>
		bulkArchiveDialog.open({ productIds: selectedItems, targetStatus: "ARCHIVED" }),
	);
	const handleBulkRestore = requireSelection(() =>
		bulkArchiveDialog.open({ productIds: selectedItems, targetStatus: "PUBLIC" }),
	);
	const handleBulkDelete = requireSelection(() => {
		const productTitles = selectedProducts
			.map((p) => p.title)
			.filter((title): title is string => Boolean(title));
		bulkDeleteDialog.open({ productIds: selectedItems, productTitles });
	});
	const handlePublish = requireSelection(() => changeProductStatus(selectedItems, "PUBLIC"));
	const handleUnpublish = requireSelection(() => changeProductStatus(selectedItems, "DRAFT"));

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
					description: "Désélectionne les archivés pour continuer",
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
					label: "Supprimer définitivement",
					description: "Action irréversible",
					icon: Trash2,
					variant: "destructive",
					hidden: !status.allArchived,
					onSelect: handleBulkDelete,
				},
			],
		},
	];

	const selectionLabel = `${selectedItems.length} bijou${selectedItems.length > 1 ? "x" : ""} sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
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
				description={selectionLabel}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
