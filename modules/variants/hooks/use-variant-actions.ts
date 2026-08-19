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

import { useDuplicateVariant } from "./use-duplicate-variant";
import { useUpdateProductVariantStatus } from "./use-update-variant-status";

import { ADJUST_STOCK_DIALOG_ID } from "../components/admin/adjust-stock-dialog";
import { DELETE_PRODUCT_VARIANT_DIALOG_ID } from "../components/admin/delete-variant-alert-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "../components/admin/update-price-dialog";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

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
	/** Override de prix de la variante en centimes — `null` = suit le produit. */
	priceCents?: number | null;
	/** Prix du produit parent en centimes. */
	productPriceCents?: number;
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
	priceCents = null,
	productPriceCents = 0,
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
						router.push(
							`/admin/catalogue/produits/${productSlug}/variantes/${data.variantId}/modifier`,
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
					// ⚠️ Plus de `hidden: isRepresentative` : il invoquait une règle qui
					// n'existe pas. `update-variant-status` ne refuse QUE la dernière
					// variante ACTIVE d'un produit en vente — le représentant d'un produit
					// qui en compte cinq actives est parfaitement désactivable, et le geste
					// était pourtant introuvable. La vraie règle demande le compte des
					// variantes actives du produit, que cette liste paginée n'a pas : c'est
					// donc l'action qui tranche, avec son message explicite.
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
									priceCents,
									productPriceCents,
								}),
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: CopyIcon,
					disabled: isDuplicating,
					onSelect: () => duplicate(variantId),
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
