"use client";

import { AlertTriangle, ArrowRight, LayoutList, Plus, Star } from "lucide-react";
import Link from "next/link";

import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { formatEuro } from "@/shared/utils/format-euro";
import { buildVariantLabel } from "@/modules/skus/utils/sku-variant-label";
import type { GetProductReturn } from "@/modules/products/types/product.types";

const PREVIEW_LIMIT = 3;

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
	const outOfStockCount = skus.filter((sku) => sku.inventory === 0).length;
	const promoCount = skus.filter(
		(sku) => sku.compareAtPrice !== null && sku.compareAtPrice > sku.priceInclTax,
	).length;

	const sortedSkus = skus.toSorted((a, b) => {
		if (a.isDefault && !b.isDefault) return -1;
		if (!a.isDefault && b.isDefault) return 1;
		return 0;
	});
	const previewSkus = sortedSkus.slice(0, PREVIEW_LIMIT);
	const remainingCount = Math.max(0, skus.length - PREVIEW_LIMIT);

	const priceLabel =
		minPrice === null || maxPrice === null
			? "—"
			: minPrice === maxPrice
				? formatEuro(minPrice)
				: `${formatEuro(minPrice)} – ${formatEuro(maxPrice)}`;

	const stockVariant: "destructive" | "warning" | "success" =
		totalStock === 0 || totalStock <= STOCK_THRESHOLDS.CRITICAL
			? "destructive"
			: totalStock <= STOCK_THRESHOLDS.LOW
				? "warning"
				: "success";

	return (
		<Card style={{ viewTransitionName: "product-detail-skus" }}>
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
						<dd className="flex items-center gap-2">
							{promoCount > 0 ? (
								<Badge
									variant="destructive"
									aria-label={`${promoCount} variante${promoCount > 1 ? "s" : ""} en promotion`}
								>
									Promo
								</Badge>
							) : null}
							<span className="font-medium">{priceLabel}</span>
						</dd>
					</div>
				</dl>

				{outOfStockCount > 0 ? (
					<p className="text-destructive flex items-center gap-1.5 text-xs" role="status">
						<AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
						{outOfStockCount} variante{outOfStockCount > 1 ? "s" : ""} en rupture
					</p>
				) : null}

				{previewSkus.length > 0 ? (
					<ul className="-mx-2 space-y-0.5 border-t pt-3" aria-label="Aperçu des variantes">
						{previewSkus.map((sku) => {
							const label = buildVariantLabel(sku) || sku.sku;
							const isOutOfStock = sku.inventory === 0;
							const isOnPromo =
								sku.compareAtPrice !== null && sku.compareAtPrice > sku.priceInclTax;
							const discountPercent = isOnPromo
								? Math.round((1 - sku.priceInclTax / sku.compareAtPrice!) * 100)
								: 0;
							return (
								<li
									key={sku.id}
									className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
								>
									<div className="flex min-w-0 items-center gap-1.5">
										{sku.isDefault ? (
											<Star
												className="text-muted-foreground size-3 shrink-0"
												aria-label="Variante par défaut"
											/>
										) : null}
										<span className="truncate">{label}</span>
									</div>
									<div className="flex shrink-0 items-center gap-1.5">
										{isOnPromo ? (
											<Badge
												variant="destructive"
												aria-label={`En promotion, -${discountPercent}%`}
											>
												-{discountPercent}%
											</Badge>
										) : null}
										<Badge
											variant={isOutOfStock ? "destructive" : "secondary"}
											aria-label={`${sku.inventory} en stock`}
										>
											{isOutOfStock ? "Rupture" : `${sku.inventory}`}
										</Badge>
									</div>
								</li>
							);
						})}
					</ul>
				) : null}

				{remainingCount > 0 ? (
					<p className="text-muted-foreground text-xs">
						+ {remainingCount} autre{remainingCount > 1 ? "s" : ""} variante
						{remainingCount > 1 ? "s" : ""}
					</p>
				) : null}

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button
						render={
							<Link
								href={`/admin/catalogue/produits/${product.slug}/variantes/nouveau`}
								onClick={() => haptic("light")}
							/>
						}
						className="flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98]"
					>
						<Plus className="size-4" aria-hidden="true" />
						Nouvelle variante
					</Button>
					<Button
						render={
							<Link
								href={`/admin/catalogue/produits/${product.slug}/variantes`}
								onClick={() => haptic("light")}
							/>
						}
						variant="outline"
						className="flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98]"
					>
						Gérer les variantes
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
