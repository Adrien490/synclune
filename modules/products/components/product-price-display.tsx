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
import { motion, useReducedMotion } from "motion/react";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { addBusinessDays, format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProductPriceProps {
	selectedSku: ProductSku | null;
	product: GetProductReturn;
	/** Nombre de paniers contenant ce produit (FOMO "dans X paniers") */
	cartsCount?: number;
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
export function ProductPriceDisplay({ selectedSku, product, cartsCount }: ProductPriceProps) {
	const shouldReduceMotion = useReducedMotion();

	// Calculer le prix minimum et vérifier si plusieurs prix différents
	const priceInfo = calculatePriceInfo(product?.skus);

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

	// Pre-compute delivery dates to avoid creating Date objects in JSX
	const minDelivery = addBusinessDays(new Date(), SHIPPING_RATES.FR.minDays);
	const maxDelivery = addBusinessDays(new Date(), SHIPPING_RATES.FR.maxDays);

	if (!selectedSku) {
		return (
			<div
				role="region"
				aria-labelledby="product-price-title"
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
			className="space-y-3 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
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
					<motion.div
						animate={shouldReduceMotion ? {} : { opacity: [1, 0.7, 1] }}
						transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
					>
						<Badge
							variant="outline"
							className="border-orange-600 bg-orange-100 text-xs/5 tracking-normal text-orange-800 antialiased shadow-sm dark:border-orange-500 dark:bg-orange-950/80 dark:text-orange-200"
							role="status"
							aria-label={`Attention, plus que ${inventory} exemplaires en stock`}
						>
							<span className="font-bold">Plus que {inventory}</span> en stock !
						</Badge>
					</motion.div>
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

			{/* Badge "dans X paniers" - FOMO Etsy-style */}
			{cartsCount !== undefined && cartsCount > 0 && stockStatus !== "out_of_stock" && (
				<Badge
					variant="outline"
					className="border-pink-500/50 bg-pink-50 text-xs/5 tracking-normal text-pink-700 antialiased dark:border-pink-500/40 dark:bg-pink-950/60 dark:text-pink-200"
					role="status"
					aria-label={`Actuellement dans ${cartsCount} ${cartsCount === 1 ? "panier" : "paniers"}`}
				>
					Dans <span className="font-bold">{cartsCount}</span>{" "}
					{cartsCount === 1 ? "panier" : "paniers"}
				</Badge>
			)}

			{/* Date de livraison estimée */}
			{stockStatus !== "out_of_stock" && (
				<div className="text-muted-foreground pt-1 text-sm">
					<span>
						Recevez d'ici le{" "}
						<span className="text-foreground font-medium">
							{format(minDelivery, "d", { locale: fr })}-
							{format(maxDelivery, "d MMM", { locale: fr })}
						</span>
					</span>
				</div>
			)}

			{/* Message d'économie */}
			{hasDiscount && (
				<p className="text-accent-foreground text-sm font-medium" role="status">
					Économisez {formatEuro(selectedSku.compareAtPrice! - selectedSku.priceInclTax)}
				</p>
			)}

			{/* Section rupture de stock */}
			{stockStatus === "out_of_stock" && (
				<div className="space-y-3">
					<div
						className="text-destructive bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded border p-2 text-xs/5 tracking-normal antialiased"
						role="alert"
					>
						<p>Cette petite merveille sera bientôt disponible !</p>
					</div>
				</div>
			)}
		</div>
	);
}
