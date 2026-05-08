"use client";

import {
	Archive,
	ArchiveRestore,
	Copy,
	Eye,
	FolderPlus,
	LayoutList,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { ARCHIVE_PRODUCT_DIALOG_ID } from "../components/admin/archive-product-alert-dialog";
import { CHANGE_PRODUCT_STATUS_DIALOG_ID } from "../components/admin/change-product-status-alert-dialog";
import { DELETE_PRODUCT_DIALOG_ID } from "../components/admin/delete-product-alert-dialog";
import { DUPLICATE_PRODUCT_DIALOG_ID } from "../components/admin/duplicate-product-alert-dialog";
import { MANAGE_COLLECTIONS_DIALOG_ID } from "../components/admin/manage-collections-dialog";

interface UseProductActionsParams {
	productId: string;
	productSlug: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
}

/**
 * Builds the action sections shown in product row-actions (desktop) and the
 * long-press menu (mobile). Single source of truth — both surfaces consume the
 * exact same `ActionMenuSection[]`, ensuring perfect parity.
 *
 * Wires the global dialog store IDs (delete, change-status, archive, duplicate,
 * manage-collections) so consumers don't need to know about them.
 */
export function useProductActions({
	productId,
	productSlug,
	productTitle,
	productStatus,
}: UseProductActionsParams): { sections: ActionMenuSection[] } {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_DIALOG_ID);
	const changeStatusDialog = useAlertDialog(CHANGE_PRODUCT_STATUS_DIALOG_ID);
	const archiveDialog = useAlertDialog(ARCHIVE_PRODUCT_DIALOG_ID);
	const duplicateDialog = useAlertDialog(DUPLICATE_PRODUCT_DIALOG_ID);
	const collectionsDialog = useDialog(MANAGE_COLLECTIONS_DIALOG_ID);

	const isArchived = productStatus === "ARCHIVED";
	const isDraft = productStatus === "DRAFT";
	const isPublic = productStatus === "PUBLIC";

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "view",
					label: "Voir la fiche",
					icon: Eye,
					href: `/creations/${productSlug}`,
					external: true,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					href: `/admin/catalogue/produits/${productSlug}/modifier`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					onSelect: () => duplicateDialog.open({ productId, productTitle }),
				},
				{
					key: "variants",
					label: "Gérer variantes",
					icon: LayoutList,
					href: `/admin/catalogue/produits/${productSlug}/variantes`,
				},
				{
					key: "collections",
					label: "Gérer collections",
					icon: FolderPlus,
					onSelect: () => collectionsDialog.open({ productId, productTitle }),
				},
			],
		},
		{
			key: "status",
			label: "Statut",
			items: [
				{
					key: "draft",
					label: "Marquer comme brouillon",
					icon: Pencil,
					disabled: isDraft,
					hidden: isArchived,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
							currentStatus: productStatus,
							targetStatus: "DRAFT",
						}),
				},
				{
					key: "public",
					label: "Publier",
					description: "Rendre visible sur la boutique",
					icon: Upload,
					disabled: isPublic,
					hidden: isArchived,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
							currentStatus: productStatus,
							targetStatus: "PUBLIC",
						}),
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
					hidden: isArchived,
					onSelect: () => archiveDialog.open({ productId, productTitle, productStatus }),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: ArchiveRestore,
					hidden: !isArchived,
					onSelect: () => archiveDialog.open({ productId, productTitle, productStatus }),
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
					hidden: !isArchived,
					onSelect: () => deleteDialog.open({ productId, productTitle }),
				},
			],
		},
	];

	return { sections };
}
