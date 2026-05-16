"use client";

import {
	Check,
	Copy,
	DollarSign,
	Eye,
	Package,
	Pencil,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useBulkSelectionActionItem } from "@/shared/hooks/use-bulk-selection-action-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { useDuplicateSku } from "./use-duplicate-sku";
import { useSetDefaultSku } from "./use-set-default-sku";
import { useUpdateProductSkuStatus } from "./use-update-sku-status";

import { ADJUST_STOCK_DIALOG_ID } from "../components/admin/adjust-stock-dialog";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "../components/admin/delete-sku-alert-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "../components/admin/update-price-dialog";

interface UseSkuActionsParams {
	skuId: string;
	skuName: string;
	productSlug: string;
	isDefault?: boolean;
	isActive?: boolean;
	inventory?: number;
	priceInclTax?: number;
	compareAtPrice?: number | null;
}

/**
 * Builds the action sections for a SKU — single source of truth for the
 * desktop row-actions and the mobile long-press menu.
 */
export function useSkuActions({
	skuId,
	skuName,
	productSlug,
	isDefault = false,
	isActive = true,
	inventory = 0,
	priceInclTax = 0,
	compareAtPrice = null,
}: UseSkuActionsParams): { sections: ActionMenuSection[] } {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const selectActionItem = useBulkSelectionActionItem(skuId);
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { setAsDefault, isPending } = useSetDefaultSku();
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateSku({
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
				...(selectActionItem ? [selectActionItem] : []),
				{
					key: "view",
					label: "Voir les détails",
					icon: Eye,
					href: `/admin/catalogue/produits/${productSlug}/variantes/${skuId}`,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					href: `/admin/catalogue/produits/${productSlug}/variantes/${skuId}/modifier`,
				},
				{
					key: "toggle",
					label: isActive ? "Désactiver" : "Activer",
					icon: isActive ? PowerOff : Power,
					disabled: isToggling,
					hidden: isDefault,
					onSelect: () => toggleStatus(skuId, !isActive),
				},
				{
					key: "adjust-stock",
					label: "Ajuster le stock",
					icon: Package,
					closesMenu: false,
					onSelect: () =>
						isMobile
							? router.push(`/admin/catalogue/produits/${productSlug}/variantes/${skuId}/stock`)
							: adjustStockDialog.open({ skuId, skuName, currentStock: inventory }),
				},
				{
					key: "update-price",
					label: "Modifier le prix",
					icon: DollarSign,
					closesMenu: false,
					onSelect: () =>
						isMobile
							? router.push(`/admin/catalogue/produits/${productSlug}/variantes/${skuId}/prix`)
							: updatePriceDialog.open({
									skuId,
									skuName,
									currentPrice: priceInclTax,
									currentCompareAtPrice: compareAtPrice,
								}),
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(skuId, skuName),
				},
			],
		},
		{
			key: "default",
			items: [
				{
					key: "set-default",
					label: "Définir par défaut",
					icon: Check,
					disabled: isPending,
					hidden: isDefault,
					onSelect: () => setAsDefault(skuId),
				},
				{
					key: "default-badge",
					label: "Variante par défaut",
					description: "Cette variante est le choix par défaut — non supprimable",
					disabled: true,
					hidden: !isDefault,
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
					icon: Trash2,
					variant: "destructive",
					hidden: isDefault,
					closesMenu: false,
					onSelect: () => deleteDialog.open({ skuId, skuName, isDefault }),
				},
			],
		},
	];

	return { sections };
}
