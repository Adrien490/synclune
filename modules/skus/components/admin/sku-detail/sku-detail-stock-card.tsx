"use client";

import { ArrowRight, Package } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";
import { ADJUST_STOCK_DIALOG_ID } from "@/modules/skus/components/admin/adjust-stock-dialog";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailStockCardProps {
	sku: SkuDetailReturn;
}

export function SkuDetailStockCard({ sku }: SkuDetailStockCardProps) {
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const stockVariant = getStockVariant(sku.inventory);
	const orderItemsCount = sku._count.orderItems;

	return (
		<Card style={{ viewTransitionName: "sku-stock" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Package className="size-5" aria-hidden="true" />
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
							{sku.inventory === 0
								? "Rupture"
								: stockVariant === "destructive"
									? "Critique"
									: stockVariant === "warning"
										? "Faible"
										: "OK"}
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
					onClick={() =>
						adjustStockDialog.open({
							skuId: sku.id,
							skuName: sku.sku,
							currentStock: sku.inventory,
						})
					}
				>
					Ajuster le stock
					<ArrowRight className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
