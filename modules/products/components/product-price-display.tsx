"use client";

import type { ReactNode } from "react";

import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn, ProductVariant } from "@/modules/products/types/product.types";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	calculatePriceInfo,
	determineStockStatus,
} from "@/modules/products/services/product-pricing.service";

interface ProductPriceProps {
	selectedVariant: ProductVariant | null;
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
 * Le prix passe en `font-display` (Winky Sans) : c'était jusqu'ici la seule
 * information importante de la page rendue dans la police de corps.
 */
export function ProductPriceDisplay({ selectedVariant, product, children }: ProductPriceProps) {
	// Calculer le prix minimum et vérifier si plusieurs prix différents
	const priceInfo = calculatePriceInfo(product.variants, product.priceCents);
	// Prix effectif de la variante sélectionnée (override ?? prix produit)
	const selectedPrice = selectedVariant ? (selectedVariant.priceCents ?? product.priceCents) : null;

	// Déterminer si on affiche "À partir de"
	const showFromPrefix = priceInfo.hasMultiplePrices && !selectedVariant;

	// ⚠️ Pas de prix barré ni de badge de remise (retrait Omnibus 2026-08-08,
	// art. L. 112-1-1 C. conso) : cf. le commentaire de `ProductPrice` — la
	// réouverture passe par `lowestPriceLast30d` (lot A2).

	// Calculer le stock status (en stock, stock limité, ou rupture)
	const stock = selectedVariant?.stock ?? 0;
	const stockStatus = determineStockStatus(stock, selectedVariant?.active);

	if (!selectedVariant) {
		return (
			<div
				role="region"
				aria-labelledby="product-price-title"
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
					<p className="text-xs opacity-80">Choisis tes options pour voir le prix exact</p>
				)}
				{children}
			</div>
		);
	}

	return (
		<div
			role="region"
			aria-labelledby="product-price-selected"
			className="piece-field space-y-2 rounded-lg p-5 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			{/* UN SEUL porteur d'annonce pour tout le bloc.
			    La région entière était `aria-live="polite"` + `aria-atomic="true"`, et
			    contenait à la fois ce résumé sr-only ET un `<p aria-label="Prix …">` :
			    une région atomique restitue TOUT son contenu, donc le prix était lu
			    deux fois, suivi du stock et de la date de livraison. S'y ajoutaient
			    cinq `role="status"` imbriqués — chacun une live region de plus — dont
			    plusieurs sur du contenu qui ne change jamais (badge de remise, message
			    d'économie). Le changement de variante s'annonce ici, une fois, avec
			    l'état de stock ; le reste est du texte lisible à la demande. */}
			<span aria-live="polite" aria-atomic="true" className="sr-only">
				Prix mis à jour : {formatEuro(selectedPrice ?? product.priceCents)}
				{stockStatus === "in_stock" ? ", en stock" : ""}
				{stockStatus === "low_stock" ? `, plus que ${stock} en stock` : ""}
				{stockStatus === "out_of_stock" ? ", en rupture de stock" : ""}
			</span>

			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				{/* Prix principal */}
				<p
					id="product-price-selected"
					className="font-display text-3xl font-normal tracking-tight sm:text-4xl"
					aria-label={`Prix ${formatEuro(selectedPrice ?? product.priceCents)}`}
				>
					{formatEuro(selectedPrice ?? product.priceCents)}
				</p>

				{/* Disponibilité : distinguée par le LIBELLÉ, pas par la couleur */}
				<span className="ms-auto text-sm font-semibold">
					{/* Pas de `role="status"` sur ces trois états : ce sont des libellés, pas
					    des annonces. Le changement de variante est annoncé une seule fois,
					    par la live region unique en tête de bloc. */}
					{stockStatus === "in_stock" && <span>{PRODUCT_TEXTS.STOCK.IN_STOCK}</span>}
					{stockStatus === "low_stock" && (
						<span aria-label={`Attention, plus que ${stock} exemplaires en stock`}>
							{PRODUCT_TEXTS.STOCK.LOW_STOCK_LEFT(stock)}
						</span>
					)}
					{stockStatus === "out_of_stock" && (
						<Badge
							variant="destructive"
							className="text-xs/5 tracking-normal antialiased"
							aria-label="Produit en rupture de stock"
						>
							{PRODUCT_TEXTS.STOCK.OUT_OF_STOCK}
						</Badge>
					)}
				</span>
			</div>

			{/* La date de livraison n'est rendue QUE si la pièce est achetable : elle
			    s'affichait auparavant dans les deux branches, donc juste au-dessus de
			    « Cette petite merveille sera bientôt de retour ! » — on promettait une
			    livraison pour une variante épuisée. */}
			{stockStatus !== "out_of_stock" && children}

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
