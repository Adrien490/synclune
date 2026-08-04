"use client";

import type { ReactNode } from "react";

import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	calculatePriceInfo,
	determineStockStatus,
	calculateDiscountPercent,
	hasActiveDiscount,
} from "@/modules/products/services/product-pricing.service";

interface ProductPriceProps {
	selectedSku: ProductSku | null;
	product: GetProductReturn;
	/** Rendu au bas de l'aplat (estimation de livraison). */
	children?: ReactNode;
}

/**
 * ProductPriceDisplay — l'aplat de la pièce : prix, disponibilité, livraison.
 *
 * Ce bloc porte la seule couleur que la fiche possède en propre : `--piece-accent`,
 * la teinte de la variante affichée (cf. `ProductAccentScope`). Changer de couleur
 * dans le nuancier repeint donc l'aplat, pas seulement la photo.
 *
 * Trois conséquences de rédaction, toutes dictées par le contraste :
 *
 * - **l'encre reste `--foreground`** (classe `.piece-field`) — l'accent est une
 *   surface, jamais une encre ;
 * - **plus de `Badge` coloré pour le stock nominal.** Un badge `warning` (jaune)
 *   sur un aplat « Or jaune » disparaît. Les trois états se distinguent par leur
 *   LIBELLÉ (« En stock » / « Plus que 2 » / « Rupture de stock »), pas par leur
 *   teinte — ce qui satisfait aussi WCAG 1.4.1 ;
 * - **la rupture garde son `Badge destructive`** : c'est le seul état où la
 *   sémantique doit primer sur l'harmonie de l'aplat.
 *
 * Le prix passe en `font-display` (Fraunces) : c'était jusqu'ici la seule
 * information importante de la page rendue dans la police de corps.
 */
export function ProductPriceDisplay({ selectedSku, product, children }: ProductPriceProps) {
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
				className="piece-field space-y-2 rounded-lg p-5 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
			>
				<div className="flex flex-wrap items-baseline gap-3">
					{showFromPrefix && (
						<span className="text-xs font-medium tracking-wide" aria-label="Prix minimum">
							À partir de
						</span>
					)}
					<p
						id="product-price-title"
						className="font-display text-3xl font-normal tracking-tight sm:text-4xl"
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
					<p className="text-xs opacity-80" role="status">
						Choisis tes options pour voir le prix exact
					</p>
				)}
				{children}
			</div>
		);
	}

	return (
		<div
			role="region"
			aria-labelledby="product-price-selected"
			aria-live="polite"
			aria-atomic="true"
			className="piece-field space-y-2 rounded-lg p-5 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			{/* SR-only announce — explicit text read on variant change (complements aria-label) */}
			<span className="sr-only">
				Prix mis à jour : {formatEuro(selectedSku.priceInclTax)}
				{hasDiscount ? `, réduit de ${discountPercent} pourcent` : ""}
			</span>

			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				{/* Prix principal */}
				<p
					id="product-price-selected"
					className="font-display text-3xl font-normal tracking-tight sm:text-4xl"
					aria-label={`Prix ${formatEuro(selectedSku.priceInclTax)}${hasDiscount ? `, réduit de ${discountPercent} pourcent` : ""}`}
				>
					{formatEuro(selectedSku.priceInclTax)}
				</p>

				{/* Prix barré si promotion */}
				{hasDiscount && (
					<span className="text-lg line-through opacity-70">
						<span className="sr-only">Prix initial : </span>
						{formatEuro(selectedSku.compareAtPrice!)}
					</span>
				)}

				{/* Badge de réduction — inversion d'encre, lisible sur n'importe quel aplat */}
				{hasDiscount && (
					<span
						className="bg-foreground text-background rounded-full px-2.5 py-1 text-xs font-semibold"
						role="status"
						aria-label={`Réduction de ${discountPercent} pourcent`}
					>
						-{discountPercent}%
					</span>
				)}

				{/* Disponibilité : distinguée par le LIBELLÉ, pas par la couleur */}
				<span className="ms-auto text-sm font-semibold">
					{stockStatus === "in_stock" && <span role="status">{PRODUCT_TEXTS.STOCK.IN_STOCK}</span>}
					{stockStatus === "low_stock" && (
						<span
							role="status"
							aria-label={`Attention, plus que ${inventory} exemplaires en stock`}
						>
							{PRODUCT_TEXTS.STOCK.LOW_STOCK_LEFT(inventory)}
						</span>
					)}
					{stockStatus === "out_of_stock" && (
						<Badge
							variant="destructive"
							className="text-xs/5 tracking-normal antialiased"
							role="status"
							aria-label="Produit en rupture de stock"
						>
							{PRODUCT_TEXTS.STOCK.OUT_OF_STOCK}
						</Badge>
					)}
				</span>
			</div>

			{/* Message d'économie */}
			{hasDiscount && (
				<p className="text-sm font-medium" role="status">
					{PRODUCT_TEXTS.PRICING.SAVINGS(
						formatEuro(selectedSku.compareAtPrice! - selectedSku.priceInclTax),
					)}
				</p>
			)}

			{children}

			{/* Section rupture de stock */}
			{stockStatus === "out_of_stock" && (
				<div
					className="bg-background/70 mt-1 rounded-md px-3 py-2 text-xs/5 tracking-normal antialiased"
					role="alert"
				>
					<p>Cette petite merveille sera bientôt de retour !</p>
				</div>
			)}
		</div>
	);
}
