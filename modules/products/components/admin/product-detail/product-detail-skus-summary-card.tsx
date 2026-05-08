"use client";

import { ArrowRight, LayoutList, Star } from "lucide-react";
import Link from "next/link";

import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

function buildVariantLabel(sku: ProductSku): string {
	const parts: string[] = [];
	if (sku.color?.name) parts.push(sku.color.name);
	if (sku.material?.name) parts.push(sku.material.name);
	if (sku.size) parts.push(sku.size);
	return parts.join(" · ");
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

function formatPrice(priceInCents: number) {
	return PRICE_FORMATTER.format(priceInCents / 100);
}

interface ProductDetailSkusSummaryCardProps {
	product: GetProductReturn;
}

export function ProductDetailSkusSummaryCard({ product }: ProductDetailSkusSummaryCardProps) {
	const haptic = useHaptic();
	const skus = product.skus;
	const skusCount = skus.length;
	const totalStock = skus.reduce((sum, sku) => sum + sku.inventory, 0);
	const prices = skus.map((sku) => sku.priceInclTax);
	const minPrice = prices.length > 0 ? Math.min(...prices) : null;
	const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
	const defaultSku = skus.find((sku) => sku.isDefault) ?? skus[0] ?? null;
	const defaultVariantLabel = defaultSku ? buildVariantLabel(defaultSku) : "";

	const priceLabel =
		minPrice === null || maxPrice === null
			? "—"
			: minPrice === maxPrice
				? formatPrice(minPrice)
				: `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;

	const stockVariant: "destructive" | "warning" | "success" =
		totalStock === 0 || totalStock <= STOCK_THRESHOLDS.CRITICAL
			? "destructive"
			: totalStock <= STOCK_THRESHOLDS.LOW
				? "warning"
				: "success";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<LayoutList className="size-5" aria-hidden="true" />
					Variantes
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Variantes actives</dt>
						<dd className="font-medium">{skusCount}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Stock total</dt>
						<dd>
							<Badge variant={stockVariant} aria-label={`${totalStock} en stock`}>
								{totalStock}
							</Badge>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Prix</dt>
						<dd className="font-medium">{priceLabel}</dd>
					</div>
				</dl>

				{defaultSku ? (
					<div className="space-y-2 border-t pt-4">
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="shrink-0">
								<Star className="size-3" aria-hidden="true" />
								Par défaut
							</Badge>
							{defaultVariantLabel ? (
								<span className="text-foreground/90 min-w-0 truncate text-sm">
									{defaultVariantLabel}
								</span>
							) : null}
						</div>
						<p className="text-muted-foreground font-mono text-xs break-all">{defaultSku.sku}</p>
					</div>
				) : null}

				<Button
					asChild
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					<Link
						href={`/admin/catalogue/produits/${product.slug}/variantes`}
						onClick={() => haptic("light")}
					>
						Gérer les variantes
						<ArrowRight className="size-4" aria-hidden="true" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
