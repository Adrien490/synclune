"use client";

import { Archive, ArchiveRestore, Eye, Package, Pencil, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { ARCHIVE_COLLECTION_DIALOG_ID } from "../components/admin/archive-collection-alert-dialog";
import { CHANGE_COLLECTION_STATUS_DIALOG_ID } from "../components/admin/change-collection-status-alert-dialog";
import { COLLECTION_DIALOG_ID } from "../components/admin/collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "../components/admin/delete-collection-alert-dialog";

interface UseCollectionActionsParams {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	collectionDescription: string | null;
	collectionStatus: CollectionStatus;
	productsCount: number;
}

/**
 * Builds the action sections for a collection — single source of truth for
 * the desktop row-actions and the mobile long-press menu.
 *
 * "Modifier" is adaptive: on desktop opens the form dialog inline, on mobile
 * navigates to the edit page (long-press already opened the menu — Edit
 * needs to take the user *somewhere* visible).
 */
export function useCollectionActions({
	collectionId,
	collectionName,
	collectionSlug,
	collectionDescription,
	collectionStatus,
	productsCount,
}: UseCollectionActionsParams): { sections: ActionMenuSection[] } {
	const { open: openEditDialog } = useDialog(COLLECTION_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);
	const { open: openArchiveDialog } = useAlertDialog(ARCHIVE_COLLECTION_DIALOG_ID);
	const { open: openChangeStatusDialog } = useAlertDialog(CHANGE_COLLECTION_STATUS_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const isArchived = collectionStatus === CollectionStatus.ARCHIVED;
	const isDraft = collectionStatus === CollectionStatus.DRAFT;
	const isPublic = collectionStatus === CollectionStatus.PUBLIC;

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "view",
					label: "Voir la page publique",
					icon: Eye,
					href: `/collections/${collectionSlug}`,
					external: true,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/collections/${collectionSlug}/modifier`);
						} else {
							openEditDialog({
								collection: {
									id: collectionId,
									name: collectionName,
									slug: collectionSlug,
									description: collectionDescription,
									status: collectionStatus,
								},
							});
						}
					},
				},
				{
					key: "manage",
					label: "Gérer les produits",
					icon: Package,
					href: `/admin/catalogue/collections/${collectionSlug}`,
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
					closesMenu: false,
					onSelect: () =>
						openChangeStatusDialog({
							collectionId,
							collectionName,
							currentStatus: collectionStatus,
							targetStatus: CollectionStatus.DRAFT,
						}),
				},
				{
					key: "public",
					label: "Publier",
					icon: Upload,
					disabled: isPublic,
					hidden: isArchived,
					closesMenu: false,
					onSelect: () =>
						openChangeStatusDialog({
							collectionId,
							collectionName,
							currentStatus: collectionStatus,
							targetStatus: CollectionStatus.PUBLIC,
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
					closesMenu: false,
					onSelect: () => openArchiveDialog({ collectionId, collectionName, collectionStatus }),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: ArchiveRestore,
					hidden: !isArchived,
					closesMenu: false,
					onSelect: () => openArchiveDialog({ collectionId, collectionName, collectionStatus }),
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
					closesMenu: false,
					onSelect: () => openDeleteDialog({ collectionId, collectionName, productsCount }),
				},
			],
		},
	];

	return { sections };
}
