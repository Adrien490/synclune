"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPriceDisplay } from "./product-price-display";
import { ProductCharacteristics } from "./product-characteristics";
import { ProductReassurance } from "./product-reassurance";
import { ProductHighlights } from "./product-highlights";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";

import type { ReactNode } from "react";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/**
	 * `<DeliveryEstimator />`, monté par la PAGE (Server Component) et relayé ici.
	 *
	 * Il lit l'horloge (`new Date()`) pour dériver la fenêtre de livraison : le
	 * faire dans ce composant client rendait le rendu non déterministe (SSR et
	 * hydratation ne tombent pas forcément le même jour) et donnait au compilateur
	 * une valeur qu'il ne peut pas mémoïser honnêtement. Rendu côté serveur, le
	 * calcul est fait une fois, la sortie est du HTML figé, et le composant sort
	 * du bundle client.
	 */
	deliveryEstimate: ReactNode;
}

/**
 * ProductDetails — la colonne d'achat.
 *
 * Elle était une pile de neuf blocs séparés par un `space-y-8` rigoureusement
 * constant, dont trois panneaux gris à l'enveloppe identique. Trois principes la
 * gouvernent maintenant :
 *
 * **1. Un rythme, pas un pas.** Le bloc de décision (aplat du prix → nuancier →
 * CTA) est serré à 12 px : ces trois éléments forment un seul geste. Les blocs de
 * lecture sont à 24 px. Le mot de la fin est à 48 px, parce qu'on a fini d'acheter.
 * Un espacement uniforme est l'ennemi de la hiérarchie.
 *
 * **2. Une seule fiche.** Matière (`ProductHighlights`), dimension
 * (`ProductCharacteristics`) et logistique (`ProductReassurance`) partagent une
 * enveloppe unique à filets au lieu de trois cartes jumelles. Chaque composant
 * porte son propre padding et peut retourner `null` sans laisser de filet orphelin.
 *
 * **3. Plus d'`AnimatePresence` sur le prix ni sur les caractéristiques.** Les deux
 * fondus étaient keyés sur l'id du SKU et se déclenchaient au changement de
 * variante — exactement le moment où l'aplat se repeint déjà (transition CSS de
 * `.piece-field`). Deux mouvements pour un seul événement : on garde celui qui
 * porte l'information, la couleur.
 */
export function ProductDetails({ product, defaultSku, deliveryEstimate }: ProductDetailsProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });

	const currentSku = selectedSku ?? defaultSku;

	return (
		<div className="flex flex-col gap-6">
			{/* ── Le bloc de décision, serré ────────────────────────────────── */}
			<div className="flex flex-col gap-3">
				{/* 1. L'aplat de la pièce : prix, disponibilité, date de livraison.
				    Pas de wrapper aria-live ici : ProductPriceDisplay possède déjà ses
				    propres annonces SR. */}
				<ProductPriceDisplay selectedSku={currentSku} product={product}>
					{deliveryEstimate}
				</ProductPriceDisplay>

				{/* 2. Le nuancier + les autres axes de variante */}
				<VariantSelector product={product} defaultSku={defaultSku} />

				{/* 3. CTA principal (monté pour réduire la distance au fold - Baymard) */}
				<AddToCartForm product={product} selectedSku={currentSku} />
			</div>

			{/* ── 4. La description : la seule prose de la page ─────────────────
			    Elle était en `text-muted-foreground`, c'est-à-dire dans le gris exact
			    des tarifs de port, coincée entre deux blocs de service. Or il n'y a
			    pas de `metaDescription` en base : cette description EST la copie
			    vitrine, le seul endroit où Léane décrit CETTE pièce. Elle passe donc
			    en encre pleine et en Winky Sans (la display) — un trait d'encre expressif,
			    sur trois phrases éditoriales, pas sur du texte courant. */}
			{product.description && (
				<div id="product-description" className="max-w-[34rem] space-y-3">
					<h2 className="sr-only">Description</h2>
					{product.description.split("\n").map((line, i) => (
						<p
							key={`desc-line-${i}`}
							className="font-display text-foreground text-lg/8 font-normal tracking-normal"
						>
							{line || " "}
						</p>
					))}
				</div>
			)}

			{/* ── 5. La fiche : une seule enveloppe, trois filets ───────────────
			    Matière, dimension, logistique. Chaque section rend son propre padding
			    (cf. `ProductCharacteristics`, qui peut retourner `null`). */}
			<div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
				<ProductHighlights product={product} />
				<ProductCharacteristics selectedSku={currentSku} />
				<ProductReassurance />
			</div>

			{/* ── 6. Le mot de la fin, détaché ─────────────────────────────────── */}
			<div className="pt-6">
				<ProductCareInfo primaryMaterial={currentSku.materials[0]?.material.name} />
			</div>
		</div>
	);
}
