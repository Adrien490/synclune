"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { AlertCircle, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { StockNotificationForm } from "@/modules/stock-notifications/components/stock-notification-form";

interface ProductPriceProps {
	selectedSku: ProductSku | null;
	product: GetProductReturn;
}

/**
 * ProductPriceDisplay - Affiche le prix du SKU sélectionné avec sa disponibilité
 *
 * Responsabilités :
 * - Afficher le prix formaté en euros avec "À partir de" si plusieurs prix
 * - Afficher le prix barré si promotion (compareAtPrice)
 * - Afficher le badge de réduction
 * - Afficher le badge de disponibilité (En stock / Stock limité / Rupture)
 */
export function ProductPriceDisplay({ selectedSku, product }: ProductPriceProps) {
	// Calculer le prix minimum et vérifier si plusieurs prix différents
	const priceInfo = (() => {
		if (!product || !product.skus || product.skus.length === 0) {
			return { minPrice: 0, hasMultiplePrices: false };
		}

		const activePrices = product.skus
			.filter(sku => sku.isActive)
			.map(sku => sku.priceInclTax);

		if (activePrices.length === 0) {
			return { minPrice: 0, hasMultiplePrices: false };
		}

		const minPrice = Math.min(...activePrices);
		const maxPrice = Math.max(...activePrices);
		const hasMultiplePrices = minPrice !== maxPrice;

		return { minPrice, hasMultiplePrices };
	})();

	// Déterminer si on affiche "À partir de"
	const showFromPrefix = priceInfo.hasMultiplePrices && !selectedSku;

	// Calculer la réduction si promotion
	const hasDiscount = selectedSku?.compareAtPrice &&
		selectedSku.compareAtPrice > selectedSku.priceInclTax;

	const discountPercent = hasDiscount
		? Math.round(((selectedSku.compareAtPrice! - selectedSku.priceInclTax) / selectedSku.compareAtPrice!) * 100)
		: 0;

	// Calculer le stock status (en stock, stock limité, ou rupture)
	const inventory = selectedSku?.inventory || 0;
	const isAvailable = selectedSku ? inventory > 0 && selectedSku.isActive : false;
	const stockStatus =
		!selectedSku?.isActive || inventory === 0
			? "out_of_stock"
			: inventory <= STOCK_THRESHOLDS.LOW
				? "low_stock"
				: "in_stock";

	if (!selectedSku) {
		return (
			<Card role="region" aria-labelledby="product-price-title" className="transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60">
				<CardContent className="pt-6 space-y-4">
					<div className="flex items-baseline gap-3 flex-wrap">
						{showFromPrefix && (
							<Badge
								variant="secondary"
								className="text-xs font-medium px-2 py-0.5"
								aria-label="Prix minimum"
							>
								À partir de
							</Badge>
						)}
						<p
							id="product-price-title"
							className="text-3xl sm:text-2xl font-bold tracking-tight text-foreground"
							aria-label={priceInfo.minPrice > 0 ? `Prix à partir de ${formatEuro(priceInfo.minPrice)}` : "Prix non disponible"}
						>
							{priceInfo.minPrice > 0 ? formatEuro(priceInfo.minPrice) : "—"}
						</p>
					</div>
					{priceInfo.hasMultiplePrices && (
						<p className="text-xs text-muted-foreground" role="status">
							Sélectionne tes options pour voir le prix exact
						</p>
					)}
				</CardContent>
			</Card>
		);
	}

	// URL Schema.org pour la disponibilité
	const availabilityUrl =
		stockStatus === "out_of_stock"
			? "https://schema.org/OutOfStock"
			: stockStatus === "low_stock"
				? "https://schema.org/LimitedAvailability"
				: "https://schema.org/InStock";

	return (
		<Card
			role="region"
			aria-labelledby="product-price-selected"
			itemScope
			itemType="https://schema.org/Offer"
			itemProp="offers"
			className="border-primary/10 shadow-sm transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			{/* Microdata Schema.org cachées */}
			<meta itemProp="priceCurrency" content="EUR" />
			<link itemProp="availability" href={availabilityUrl} />

			<CardContent className="pt-6 space-y-3">
				<div className="flex items-baseline gap-3 flex-wrap">
					{/* Prix principal */}
					<p
						id="product-price-selected"
						className="text-3xl sm:text-2xl font-bold tracking-tight text-foreground"
						itemProp="price"
						content={String(selectedSku.priceInclTax / 100)}
						aria-label={`Prix ${formatEuro(selectedSku.priceInclTax)}${hasDiscount ? `, réduit de ${discountPercent} pourcent` : ''}`}
					>
						{formatEuro(selectedSku.priceInclTax)}
					</p>

					{/* Prix barré si promotion */}
					{hasDiscount && (
						<span className="text-lg text-muted-foreground line-through" aria-label={`Prix initial ${formatEuro(selectedSku.compareAtPrice!)}`}>
							{formatEuro(selectedSku.compareAtPrice!)}
						</span>
					)}

					{/* Badge de réduction */}
					{hasDiscount && (
						<span
							className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-accent/30"
							role="status"
							aria-label={`Réduction de ${discountPercent} pourcent`}
						>
							-{discountPercent}%
						</span>
					)}
				</div>

				{/* Badge de disponibilité (en stock, stock limité, rupture) */}
				<div className="flex items-center gap-2">
					{stockStatus === "in_stock" && (
						<Badge
							variant="secondary"
							className="text-xs/5 tracking-normal antialiased gap-1.5"
							role="status"
							aria-label="Produit en stock"
						>
							<CheckCircle className="w-3 h-3" aria-hidden="true" />
							En stock
						</Badge>
					)}
					{stockStatus === "low_stock" && (
						<Badge
							variant="outline"
							className="text-xs/5 tracking-normal antialiased gap-1.5 border-orange-600 text-orange-800 bg-orange-100 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-500 motion-safe:animate-pulse shadow-sm"
							role="status"
							aria-label={`Attention, plus que ${inventory} exemplaires en stock. Dépêchez-vous !`}
						>
							<AlertTriangle className="w-3.5 h-3.5 motion-safe:animate-bounce" aria-hidden="true" />
							<span>
								<span className="font-bold">Plus que {inventory}</span> en stock !
							</span>
						</Badge>
					)}
					{stockStatus === "out_of_stock" && (
						<Badge
							variant="destructive"
							className="text-xs/5 tracking-normal antialiased gap-1.5"
							role="status"
							aria-label="Produit en rupture de stock"
						>
							<AlertCircle className="w-3 h-3" aria-hidden="true" />
							Rupture de stock
						</Badge>
					)}
				</div>

				{/* Message d'économie */}
				{hasDiscount && (
					<p className="text-sm text-accent-foreground font-medium" role="status">
						Économisez {formatEuro(selectedSku.compareAtPrice! - selectedSku.priceInclTax)}
					</p>
				)}

				{/* Section rupture de stock avec formulaire de notification */}
				{stockStatus === "out_of_stock" && (
					<div className="space-y-3">
						<div
							className="text-xs/5 tracking-normal antialiased text-destructive p-2 bg-destructive/10 rounded border border-destructive/20 flex items-start gap-2"
							role="alert"
						>
							<Sparkles className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
							<p>Cette petite merveille sera bientôt disponible !</p>
						</div>

						{/* Formulaire de notification de retour en stock */}
						<StockNotificationForm skuId={selectedSku.id} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
