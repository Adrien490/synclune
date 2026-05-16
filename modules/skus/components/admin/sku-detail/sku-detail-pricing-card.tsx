"use client";

import { ArrowRight, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { UPDATE_PRICE_DIALOG_ID } from "@/modules/skus/components/admin/update-price-dialog";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailPricingCardProps {
	sku: SkuDetailReturn;
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

export function SkuDetailPricingCard({ sku }: SkuDetailPricingCardProps) {
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleUpdatePrice = () => {
		if (isMobile) {
			router.push(`/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}/prix`);
		} else {
			updatePriceDialog.open({
				skuId: sku.id,
				skuName: sku.sku,
				currentPrice: sku.priceInclTax,
				currentCompareAtPrice: sku.compareAtPrice,
			});
		}
	};

	const hasValidCompare = sku.compareAtPrice !== null && sku.compareAtPrice > sku.priceInclTax;
	const discountPercent = hasValidCompare
		? Math.round(((sku.compareAtPrice! - sku.priceInclTax) / sku.compareAtPrice!) * 100)
		: null;

	return (
		<Card style={{ viewTransitionName: "sku-edit-pricing" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<DollarSign className="size-5" aria-hidden="true" />
					Tarification
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex flex-wrap items-baseline gap-2">
						<span className="font-display text-foreground text-2xl font-medium">
							{formatPrice(sku.priceInclTax)}
						</span>
						{hasValidCompare ? (
							<>
								<span className="text-muted-foreground text-sm line-through">
									{formatPrice(sku.compareAtPrice!)}
								</span>
								<Badge variant="destructive">-{discountPercent}%</Badge>
							</>
						) : null}
					</div>
					<p className="text-muted-foreground text-xs">Prix TTC</p>
				</div>

				<Button
					type="button"
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
					onClick={handleUpdatePrice}
				>
					Modifier le prix
					<ArrowRight className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
