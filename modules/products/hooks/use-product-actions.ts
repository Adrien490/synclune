"use client";

import {
	ArchiveIcon,
	BoxArrowUpIcon,
	CopyIcon,
	EyeIcon,
	FolderPlusIcon,
	ListDashesIcon,
	PencilSimpleIcon,
	TrashIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react/ssr";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";

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
				// « Voir la fiche » seulement si PUBLIC : sur un DRAFT ou ARCHIVED la
				// vitrine répond notFound() — le lien menait à un 404 garanti.
				...(isPublic
					? [
							{
								key: "view",
								label: "Voir la fiche",
								icon: EyeIcon,
								href: `/creations/${productSlug}`,
								external: true,
							},
						]
					: []),
				{
					key: "edit",
					label: "Modifier",
					icon: PencilSimpleIcon,
					href: `/admin/catalogue/produits/${productSlug}/modifier`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: CopyIcon,
					closesMenu: false,
					onSelect: () => duplicateDialog.open({ productId, productTitle }),
				},
				{
					key: "variants",
					label: "Gérer variantes",
					icon: ListDashesIcon,
					href: `/admin/catalogue/produits/${productSlug}/variantes`,
				},
				{
					key: "collections",
					label: "Gérer collections",
					icon: FolderPlusIcon,
					closesMenu: false,
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
					icon: PencilSimpleIcon,
					disabled: isDraft,
					hidden: isArchived,
					closesMenu: false,
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
					icon: UploadSimpleIcon,
					disabled: isPublic,
					hidden: isArchived,
					closesMenu: false,
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
					icon: ArchiveIcon,
					hidden: isArchived,
					closesMenu: false,
					onSelect: () => archiveDialog.open({ productId, productTitle, productStatus }),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: BoxArrowUpIcon,
					hidden: !isArchived,
					closesMenu: false,
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
					icon: TrashIcon,
					variant: "destructive",
					hidden: !isArchived,
					closesMenu: false,
					onSelect: () => deleteDialog.open({ productId, productTitle }),
				},
			],
		},
	];

	return { sections };
}
