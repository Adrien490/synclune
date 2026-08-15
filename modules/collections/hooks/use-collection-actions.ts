"use client";

import {
	EyeIcon,
	PackageIcon,
	PencilSimpleIcon,
	TrashIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";

import { CHANGE_COLLECTION_STATUS_DIALOG_ID } from "../components/admin/change-collection-status-alert-dialog";
import { COLLECTION_DIALOG_ID } from "../components/admin/collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "../components/admin/delete-collection-alert-dialog";

interface UseCollectionActionsParams {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	collectionDescription: string | null;
	collectionActive: boolean;
	productsCount: number;
}

/**
 * Builds the action sections for a collection — single source of truth for
 * the desktop row-actions and the mobile long-press menu.
 *
 * Schéma lean (lot 2) : le statut est un booléen `active` (publiée /
 * brouillon) — plus d'état « archivée ».
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
	collectionActive,
	productsCount,
}: UseCollectionActionsParams): { sections: ActionMenuSection[] } {
	const { open: openEditDialog } = useDialog(COLLECTION_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);
	const { open: openChangeStatusDialog } = useAlertDialog(CHANGE_COLLECTION_STATUS_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "view",
					label: "Voir la page publique",
					icon: EyeIcon,
					href: `/collections/${collectionSlug}`,
					external: true,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: PencilSimpleIcon,
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
									active: collectionActive,
								},
							});
						}
					},
				},
				{
					key: "manage",
					label: "Gérer les produits",
					icon: PackageIcon,
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
					icon: PencilSimpleIcon,
					disabled: !collectionActive,
					closesMenu: false,
					onSelect: () =>
						openChangeStatusDialog({
							collectionId,
							collectionName,
							targetActive: false,
						}),
				},
				{
					key: "public",
					label: "Publier",
					icon: UploadSimpleIcon,
					disabled: collectionActive,
					closesMenu: false,
					onSelect: () =>
						openChangeStatusDialog({
							collectionId,
							collectionName,
							targetActive: true,
						}),
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
					closesMenu: false,
					onSelect: () => openDeleteDialog({ collectionId, collectionName, productsCount }),
				},
			],
		},
	];

	return { sections };
}
