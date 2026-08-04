"use client";

import { ArrowRightIcon, PackageIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	getStockAriaLabel,
	getStockStatusLabel,
	getStockVariant,
} from "@/shared/utils/stock-variant";
import { ADJUST_STOCK_DIALOG_ID } from "@/modules/skus/components/admin/adjust-stock-dialog";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailStockCardProps {
	sku: SkuDetailReturn;
}

export function SkuDetailStockCard({ sku }: SkuDetailStockCardProps) {
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleAdjustStock = () => {
		if (isMobile) {
			router.push(`/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}/stock`);
		} else {
			adjustStockDialog.open({
				skuId: sku.id,
				skuName: sku.sku,
				currentStock: sku.inventory,
			});
		}
	};
	const stockVariant = getStockVariant(sku.inventory);
	const orderItemsCount = sku._count.orderItems;

	return (
		<Card style={{ viewTransitionName: "sku-edit-stock" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PackageIcon className="size-5" aria-hidden="true" />
					Stock
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-baseline gap-3">
						<span className="font-display text-foreground text-2xl font-medium">
							{sku.inventory}
						</span>
						<Badge
							variant={stockVariant}
							aria-label={getStockAriaLabel(sku.inventory)}
							style={{ viewTransitionName: `sku-stock-${sku.id}` }}
						>
							{getStockStatusLabel(sku.inventory)}
						</Badge>
					</div>
					{orderItemsCount > 0 ? (
						<p className="text-muted-foreground text-xs">
							{orderItemsCount} commande{orderItemsCount > 1 ? "s" : ""} contiennent cette variante.
						</p>
					) : null}
				</div>

				<Button
					type="button"
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
					onClick={handleAdjustStock}
				>
					Ajuster le stock
					<ArrowRightIcon className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
