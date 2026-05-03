"use client";

import {
	Check,
	Copy,
	DollarSign,
	EllipsisVertical,
	Package,
	Pencil,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useDuplicateSku } from "@/modules/skus/hooks/use-duplicate-sku";
import { useSetDefaultSku } from "@/modules/skus/hooks/use-set-default-sku";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";

import { ADJUST_STOCK_DIALOG_ID } from "./adjust-stock-dialog";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "./delete-sku-alert-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "./update-price-dialog";

interface ProductSkuRowActionsProps {
	skuId: string;
	skuName: string;
	productSlug: string;
	isDefault?: boolean;
	isActive?: boolean;
	inventory?: number;
	priceInclTax?: number;
	compareAtPrice?: number | null;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

export function ProductSkuRowActions({
	skuId,
	skuName,
	productSlug,
	isDefault = false,
	isActive = true,
	inventory = 0,
	priceInclTax = 0,
	compareAtPrice = null,
	open,
	onOpenChange,
	hideTrigger,
}: ProductSkuRowActionsProps) {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { setAsDefault, isPending } = useSetDefaultSku();
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateSku();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
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
					onSelect: () => adjustStockDialog.open({ skuId, skuName, currentStock: inventory }),
				},
				{
					key: "update-price",
					label: "Modifier le prix",
					icon: DollarSign,
					onSelect: () =>
						updatePriceDialog.open({
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
					onSelect: () => deleteDialog.open({ skuId, skuName, isDefault }),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu open={open} onOpenChange={onOpenChange}>
			{!hideTrigger && (
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions pour cette variante"
					>
						<EllipsisVertical className="h-4 w-4" />
						<span className="sr-only">Ouvrir le menu d&apos;actions</span>
					</Button>
				</ResponsiveActionMenuTrigger>
			)}
			<ResponsiveActionMenuContent
				title="Actions variante"
				description={skuName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
