"use client";

import { Copy, ExternalLink, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";

import type { TaxonomyDeletePayload } from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";

import { PRODUCT_TYPE_DIALOG_ID } from "../components/product-type-form-dialog";

import { useDuplicateProductType } from "./use-duplicate-product-type";
import { useToggleProductTypeStatus } from "./use-toggle-product-type-status";
import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "../components/admin/delete-product-type-alert-dialog";

interface UseProductTypeActionsParams {
	productTypeId: string;
	isSystem?: boolean;
	label: string;
	description?: string | null;
	slug: string;
	productsCount?: number;
	/**
	 * Pilote l'item Activer/Désactiver. Optionnel : `undefined` masque l'item, pour
	 * les surfaces qui ne connaissent pas l'état (rien ne doit deviner un booléen).
	 */
	isActive?: boolean;
}

export function useProductTypeActions({
	productTypeId,
	isSystem = false,
	label,
	description,
	slug,
	productsCount = 0,
	isActive,
}: UseProductTypeActionsParams): { sections: ActionMenuSection[] } {
	const { open: openFormDialog } = useDialog(PRODUCT_TYPE_DIALOG_ID);
	// Typé contre le payload du dialog mutualisé : les clés historiques
	// (`productTypeId`/`label`/`productsCount`) rendaient le champ caché vide
	// et la suppression impossible depuis l'UI — avec ce générique, la dérive
	// ne compile plus.
	const deleteDialog = useAlertDialog<TaxonomyDeletePayload>(DELETE_PRODUCT_TYPE_DIALOG_ID);
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const { duplicate, isPending: isDuplicating } = useDuplicateProductType({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir le type",
					onClick: () =>
						withViewTransition(() =>
							router.push(`/admin/catalogue/types-de-produits/${data.slug}/modifier`),
						),
				},
			});
		},
	});

	const { toggleStatus, isPending: isToggling } = useToggleProductTypeStatus();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			label: isSystem ? "Type système protégé" : undefined,
			items: [
				{
					key: "edit",
					label: isSystem ? "Voir (lecture seule)" : "Éditer",
					icon: Pencil,
					disabled: isSystem,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/types-de-produits/${slug}/modifier`);
						} else {
							openFormDialog({
								productType: {
									id: productTypeId,
									label,
									description: description ?? null,
									slug,
								},
							});
						}
					},
				},
				{
					key: "products",
					label: "Voir les produits",
					icon: ExternalLink,
					href: `/admin/catalogue/produits?filter_typeId=${slug}`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(productTypeId),
				},
				// En mobile, la liste n'affiche l'état que sous forme de badge en lecture
				// seule : sans cet item, activer/désactiver un type y était IMPOSSIBLE
				// (l'interrupteur ne vit que dans le tableau desktop). Parité avec
				// `use-material-actions`. Masqué pour les types système, que la DB refuse
				// de basculer (`updateMany where isSystem: false`).
				...(isActive === undefined || isSystem
					? []
					: [
							{
								key: "toggle",
								label: isActive ? "Désactiver" : "Activer",
								icon: isActive ? PowerOff : Power,
								disabled: isToggling,
								onSelect: () => toggleStatus(productTypeId, !isActive),
							},
						]),
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
					hidden: isSystem,
					closesMenu: false,
					onSelect: () =>
						deleteDialog.open({
							id: productTypeId,
							displayName: label,
							usageCount: productsCount,
						}),
				},
			],
		},
	];

	return { sections };
}
