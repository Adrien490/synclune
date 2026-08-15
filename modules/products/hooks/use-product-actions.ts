"use client";

import {
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

import { CHANGE_PRODUCT_STATUS_DIALOG_ID } from "../components/admin/change-product-status-alert-dialog";
import { DELETE_PRODUCT_DIALOG_ID } from "../components/admin/delete-product-alert-dialog";
import { DUPLICATE_PRODUCT_DIALOG_ID } from "../components/admin/duplicate-product-alert-dialog";
import { MANAGE_COLLECTIONS_DIALOG_ID } from "../components/admin/manage-collections-dialog";

interface UseProductActionsParams {
	productId: string;
	productSlug: string;
	productTitle: string;
	productActive: boolean;
}

/**
 * Builds the action sections shown in product row-actions (desktop) and the
 * long-press menu (mobile). Single source of truth — both surfaces consume the
 * exact same `ActionMenuSection[]`, ensuring perfect parity.
 *
 * Schéma lean (lot 2) : le statut produit est le booléen `active` — plus
 * d'état « archivé », la suppression est réelle et toujours proposée.
 */
export function useProductActions({
	productId,
	productSlug,
	productTitle,
	productActive,
}: UseProductActionsParams): { sections: ActionMenuSection[] } {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_DIALOG_ID);
	const changeStatusDialog = useAlertDialog(CHANGE_PRODUCT_STATUS_DIALOG_ID);
	const duplicateDialog = useAlertDialog(DUPLICATE_PRODUCT_DIALOG_ID);
	const collectionsDialog = useDialog(MANAGE_COLLECTIONS_DIALOG_ID);

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				// « Voir la fiche » seulement si le bijou est en vente : sur un
				// brouillon la vitrine répond notFound() — le lien menait à un 404.
				...(productActive
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
					disabled: !productActive,
					closesMenu: false,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
							targetActive: false,
						}),
				},
				{
					key: "public",
					label: "Mettre en vente",
					description: "Rendre visible sur la boutique",
					icon: UploadSimpleIcon,
					disabled: productActive,
					closesMenu: false,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
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
					onSelect: () => deleteDialog.open({ productId, productTitle }),
				},
			],
		},
	];

	return { sections };
}
