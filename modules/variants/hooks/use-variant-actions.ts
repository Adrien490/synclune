"use client";

import {
	CopyIcon,
	CurrencyDollarIcon,
	EyeIcon,
	PackageIcon,
	PencilSimpleIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";

import { useDuplicateVariant } from "./use-duplicate-variant";
import { useUpdateProductVariantStatus } from "./use-update-variant-status";

import { ADJUST_STOCK_DIALOG_ID } from "../components/admin/adjust-stock-dialog";
import { DELETE_PRODUCT_VARIANT_DIALOG_ID } from "../components/admin/delete-variant-alert-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "../components/admin/update-price-dialog";

interface UseVariantActionsParams {
	variantId: string;
	variantName: string;
	productSlug: string;
	/**
	 * Vrai si ce VARIANT est le représentant du produit — rang 0 de
	 * (position asc, id asc), calculé au niveau liste ou data layer (remplace la
	 * colonne `isDefault`, audit schéma V5, lot A2).
	 */
	isRepresentative?: boolean;
	active?: boolean;
	stock?: number;
	priceCents?: number;
}

/**
 * Builds the action sections for a VARIANT — single source of truth for the
 * desktop row-actions and the mobile long-press menu.
 */
export function useVariantActions({
	variantId,
	variantName,
	productSlug,
	isRepresentative = false,
	active = true,
	stock = 0,
	priceCents = 0,
}: UseVariantActionsParams): { sections: ActionMenuSection[] } {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_VARIANT_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { toggleStatus, isPending: isToggling } = useUpdateProductVariantStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateVariant({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir la variante",
					onClick: () =>
						withViewTransition(() =>
							router.push(
								`/admin/catalogue/produits/${data.productSlug}/variantes/${data.id}/modifier`,
							),
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
					key: "view",
					label: "Voir les détails",
					icon: EyeIcon,
					href: `/admin/catalogue/produits/${productSlug}/variantes/${variantId}`,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: PencilSimpleIcon,
					href: `/admin/catalogue/produits/${productSlug}/variantes/${variantId}/modifier`,
				},
				{
					key: "toggle",
					label: active ? "Désactiver" : "Activer",
					icon: active ? ToggleLeftIcon : ToggleRightIcon,
					disabled: isToggling,
					// L'action refuse de désactiver le représentant (update-variant-status) :
					// ne pas proposer un geste voué à l'erreur.
					hidden: isRepresentative,
					onSelect: () => toggleStatus(variantId, !active),
				},
				{
					key: "adjust-stock",
					label: "Ajuster le stock",
					icon: PackageIcon,
					closesMenu: false,
					onSelect: () =>
						isMobile
							? router.push(`/admin/catalogue/produits/${productSlug}/variantes/${variantId}/stock`)
							: adjustStockDialog.open({ variantId, variantName, currentStock: stock }),
				},
				{
					key: "update-price",
					label: "Modifier le prix",
					icon: CurrencyDollarIcon,
					closesMenu: false,
					onSelect: () =>
						isMobile
							? router.push(`/admin/catalogue/produits/${productSlug}/variantes/${variantId}/prix`)
							: updatePriceDialog.open({
									variantId,
									variantName,
									currentPrice: priceCents,
								}),
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: CopyIcon,
					disabled: isDuplicating,
					onSelect: () => duplicate(variantId, variantName),
				},
			],
		},
		{
			key: "default",
			items: [
				{
					key: "default-badge",
					label: "Variante par défaut",
					description: "Cette variante est affichée en premier sur la fiche produit",
					disabled: true,
					hidden: !isRepresentative,
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
					icon: TrashIcon,
					variant: "destructive",
					// Supprimer le représentant est permis depuis le passage au rang
					// (position asc, id asc) : la variante suivante prend mécaniquement
					// le relais, plus besoin de transfert préalable (delete-variant, lot A2).
					// Les vrais refus (dernière variante, commandes liées) restent portés
					// par l'action.
					closesMenu: false,
					onSelect: () => deleteDialog.open({ variantId, variantName, isRepresentative }),
				},
			],
		},
	];

	return { sections };
}
