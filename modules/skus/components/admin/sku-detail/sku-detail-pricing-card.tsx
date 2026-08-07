"use client";

import { ArrowRightIcon, CurrencyDollarIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { formatEuro } from "@/shared/utils/format-euro";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { UPDATE_PRICE_DIALOG_ID } from "@/modules/skus/components/admin/update-price-dialog";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailPricingCardProps {
	sku: SkuDetailReturn;
}

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
					<CurrencyDollarIcon className="size-5" aria-hidden="true" />
					Tarification
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex flex-wrap items-baseline gap-2">
						<span className="font-display text-foreground text-2xl font-medium">
							{formatEuro(sku.priceInclTax)}
						</span>
						{hasValidCompare ? (
							<>
								<span className="text-muted-foreground text-sm line-through">
									{formatEuro(sku.compareAtPrice!)}
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
					<ArrowRightIcon className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
