"use client";

import { ArrowRightIcon, CurrencyDollarIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { formatEuro } from "@/shared/utils/format-euro";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { UPDATE_PRICE_DIALOG_ID } from "@/modules/variants/components/admin/update-price-dialog";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailPricingCardProps {
	variant: VariantDetailReturn;
}

export function VariantDetailPricingCard({ variant }: VariantDetailPricingCardProps) {
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const effectivePrice = variant.priceCents ?? variant.product.priceCents;
	const hasOverride = variant.priceCents !== null;

	const handleUpdatePrice = () => {
		if (isMobile) {
			router.push(`/admin/catalogue/produits/${variant.product.slug}/variantes/${variant.id}/prix`);
		} else {
			updatePriceDialog.open({
				variantId: variant.id,
				variantName: variant.product.name,
				currentPrice: effectivePrice,
			});
		}
	};

	return (
		<Card style={{ viewTransitionName: "variant-edit-pricing" }}>
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
							{formatEuro(effectivePrice)}
						</span>
						{!hasOverride ? <Badge variant="outline">Prix du produit</Badge> : null}
					</div>
					<p className="text-muted-foreground text-xs">
						{hasOverride ? "Prix propre à la variante (TTC)" : "Hérité du prix produit (TTC)"}
					</p>
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
