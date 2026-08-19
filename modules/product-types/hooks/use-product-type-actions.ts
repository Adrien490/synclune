"use client";

import {
	ArrowSquareOutIcon,
	CopyIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { toast } from "@/shared/utils/toast";

import type { TaxonomyDeletePayload } from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";

import { PRODUCT_TYPE_DIALOG_ID } from "../components/product-type-form-dialog";

import { useDuplicateProductType } from "./use-duplicate-product-type";
import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "../components/admin/delete-product-type-alert-dialog";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface UseProductTypeActionsParams {
	productTypeId: string;
	label: string;
	slug: string;
	productsCount?: number;
}

export function useProductTypeActions({
	productTypeId,
	label,
	slug,
	productsCount = 0,
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
						router.push(
							`/admin/catalogue/types-de-produits/${data.id}/modifier`,
							PAGE_FADE_NAVIGATION,
						),
				},
			});
		},
	});

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: PencilSimpleIcon,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/types-de-produits/${slug}/modifier`);
						} else {
							openFormDialog({
								productType: {
									id: productTypeId,
									label,
									slug,
								},
							});
						}
					},
				},
				{
					key: "products",
					label: "Voir les produits",
					icon: ArrowSquareOutIcon,
					href: `/admin/catalogue/produits?filter_typeId=${slug}`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: CopyIcon,
					disabled: isDuplicating,
					onSelect: () => duplicate(productTypeId),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: TrashIcon,
					variant: "destructive",
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
