"use client";

import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	calculatePriceInfo,
	determineStockStatus,
	calculateDiscountPercent,
	hasActiveDiscount,
} from "@/modules/products/services/product-pricing.service";
import { CARTS_COUNT_MIN_THRESHOLD } from "@/modules/products/constants/social-proof.constants";
import { NotifyBackInStockButton } from "@/modules/wishlist/components/notify-back-in-stock-button";

interface ProductPriceProps {
	selectedSku: ProductSku | null;
	product: GetProductReturn;
	/** Nombre de paniers contenant ce produit (FOMO "dans X paniers") */
	cartsCount?: number;
	/** Whether this product is in the user's wishlist (for back-in-stock CTA) */
	isInWishlist?: boolean;
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
export function ProductPriceDisplay({
	selectedSku,
	product,
	cartsCount,
	isInWishlist,
}: ProductPriceProps) {
	// Calculer le prix minimum et vérifier si plusieurs prix différents
	const priceInfo = calculatePriceInfo(product.skus);

	// Déterminer si on affiche "À partir de"
	const showFromPrefix = priceInfo.hasMultiplePrices && !selectedSku;

	// Calculer la réduction si promotion
	const hasDiscount = hasActiveDiscount(
		selectedSku?.compareAtPrice,
		selectedSku?.priceInclTax ?? 0,
	);

	const discountPercent = calculateDiscountPercent(
		selectedSku?.compareAtPrice,
		selectedSku?.priceInclTax ?? 0,
	);

	// Calculer le stock status (en stock, stock limité, ou rupture)
	const inventory = selectedSku?.inventory ?? 0;
	const stockStatus = determineStockStatus(inventory, selectedSku?.isActive);

	if (!selectedSku) {
		return (
			<div
				role="region"
				aria-labelledby="product-price-title"
				aria-live="polite"
				aria-atomic="true"
				className="space-y-4 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
			>
				<div className="flex flex-wrap items-baseline gap-3">
					{showFromPrefix && (
						<Badge
							variant="secondary"
							className="px-2 py-0.5 text-xs font-medium"
							aria-label="Prix minimum"
						>
							À partir de
						</Badge>
					)}
					<p
						id="product-price-title"
						className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
						aria-label={
							priceInfo.minPrice > 0
								? `Prix à partir de ${formatEuro(priceInfo.minPrice)}`
								: "Prix non disponible"
						}
					>
						{priceInfo.minPrice > 0 ? formatEuro(priceInfo.minPrice) : "—"}
					</p>
				</div>
				{priceInfo.hasMultiplePrices && (
					<p className="text-muted-foreground text-xs" role="status">
						Sélectionnez vos options pour voir le prix exact
					</p>
				)}
			</div>
		);
	}

	return (
		<div
			role="region"
			aria-labelledby="product-price-selected"
			aria-live="polite"
			aria-atomic="true"
			className="space-y-3 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			{/* SR-only announce — explicit text read on variant change (complements aria-label) */}
			<span className="sr-only">
				Prix mis à jour : {formatEuro(selectedSku.priceInclTax)}
				{hasDiscount ? `, réduit de ${discountPercent} pourcent` : ""}
			</span>
			<div className="flex flex-wrap items-baseline gap-3">
				{/* Prix principal */}
				<p
					id="product-price-selected"
					className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
					aria-label={`Prix ${formatEuro(selectedSku.priceInclTax)}${hasDiscount ? `, réduit de ${discountPercent} pourcent` : ""}`}
				>
					{formatEuro(selectedSku.priceInclTax)}
				</p>

				{/* Prix barré si promotion */}
				{hasDiscount && (
					<span className="text-muted-foreground text-lg line-through">
						<span className="sr-only">Prix initial : </span>
						{formatEuro(selectedSku.compareAtPrice!)}
					</span>
				)}

				{/* Badge de réduction */}
				{hasDiscount && (
					<Badge
						variant="secondary"
						className="rounded-full px-2.5 py-1 text-xs font-semibold"
						role="status"
						aria-label={`Réduction de ${discountPercent} pourcent`}
					>
						-{discountPercent}%
					</Badge>
				)}
			</div>

			{/* Badge de disponibilité (en stock, stock limité, rupture) */}
			<div className="flex items-center gap-2">
				{stockStatus === "in_stock" && (
					<Badge
						variant="secondary"
						className="gap-1.5 text-xs/5 tracking-normal antialiased"
						role="status"
						aria-label="Produit en stock"
					>
						<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
						En stock
					</Badge>
				)}
				{stockStatus === "low_stock" && (
					<Badge
						variant="outline"
						className="gap-1.5 border-amber-600 bg-amber-100 text-xs/5 tracking-normal text-amber-800 antialiased shadow-sm"
						role="status"
						aria-label={`Attention, plus que ${inventory} exemplaires en stock`}
					>
						<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
						<span className="font-bold">Plus que {inventory}</span> en stock !
					</Badge>
				)}
				{stockStatus === "out_of_stock" && (
					<Badge
						variant="destructive"
						className="gap-1.5 text-xs/5 tracking-normal antialiased"
						role="status"
						aria-label="Produit en rupture de stock"
					>
						<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
						Rupture de stock
					</Badge>
				)}
			</div>

			{/* Badge "dans X paniers" - FOMO Etsy-style (seuil min = 2 pour crédibilité) */}
			{cartsCount !== undefined &&
				cartsCount >= CARTS_COUNT_MIN_THRESHOLD &&
				stockStatus !== "out_of_stock" && (
					<Badge
						variant="outline"
						className="border-pink-500/50 bg-pink-50 text-xs/5 tracking-normal text-pink-700 antialiased"
						role="status"
						aria-label={`Actuellement dans ${cartsCount} paniers`}
					>
						Dans <span className="font-bold">{cartsCount}</span> paniers
					</Badge>
				)}

			{/* Message d'économie */}
			{hasDiscount && (
				<p className="text-accent-foreground text-sm font-medium" role="status">
					Économisez {formatEuro(selectedSku.compareAtPrice! - selectedSku.priceInclTax)}
				</p>
			)}

			{/* Section rupture de stock with notify CTA */}
			{stockStatus === "out_of_stock" && (
				<div className="space-y-3">
					<div
						className="text-destructive bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded border p-2 text-xs/5 tracking-normal antialiased"
						role="alert"
					>
						<p>Cette petite merveille sera bientôt disponible !</p>
					</div>
					<NotifyBackInStockButton
						productId={product.id}
						productTitle={product.title}
						isInWishlist={isInWishlist ?? false}
					/>
				</div>
			)}
		</div>
	);
}
