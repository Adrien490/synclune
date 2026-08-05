"use client";

import { Suspense, type ComponentProps } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { extractVariantInfo } from "@/modules/skus/services/sku-info-extraction.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { useSearchParams } from "next/navigation";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ColorSelector } from "@/modules/colors/components/color-selector";
import { MaterialSelector } from "@/modules/skus/components/material-selector";
import { SizeSelector } from "@/modules/skus/components/size-selector";

interface VariantSelectorProps {
	product: GetProductReturn;
	defaultSku?: ProductSku;
}

/**
 * VariantSelector - Orchestrateur des sélecteurs de variantes
 *
 * Responsabilités :
 * - Orchestrer l'affichage des sélecteurs (couleur, matériau, taille)
 * - Calculer les variantes disponibles depuis le produit
 * - Déterminer quels sélecteurs afficher
 *
 * Note : Chaque sélecteur enfant est autonome et gère sa propre navigation URL
 */
function VariantSelectorInner({ product, defaultSku }: VariantSelectorProps) {
	const searchParams = useSearchParams();

	// Lire l'état depuis l'URL pour la validation.
	// La couleur est pilotée par `?variant=<comboKey>` (M2M depuis 2026-05-15) ;
	// `?color=` est le paramètre legacy, lu en repli pour les vieux liens. Ne lire
	// que `color` revenait à valider un paramètre mort — même défaut que celui
	// corrigé dans `add-to-cart-form.tsx`, resté ici pendant ce temps.
	const variants = {
		color: searchParams.get("variant") ?? searchParams.get("color"),
		material: searchParams.get("material"),
		size: searchParams.get("size"),
	};

	// Déterminer si la taille est requise
	const { requiresSize, validationErrors } = useVariantValidation({ product, selection: variants });

	// Calculer les variantes disponibles depuis le produit
	const variantInfo = extractVariantInfo(product);

	// SKU selectionne pour le message de disponibilite
	const { selectedSku } = useSelectedSku({ product, defaultSku });

	// Préfixe le message de disponibilité par la combinaison sélectionnée (M2M)
	// pour que les lecteurs d'écran annoncent « Variante Or rose et Argent en stock »
	// plutôt qu'un « En stock » contextuellement pauvre.
	const getSelectedVariantPrefix = () => {
		if (!selectedSku) return "";
		const combo = variantInfo.availableCombos.find((c) =>
			c.colors.every((color) => selectedSku.colors.some((sc) => sc.colorId === color.id)),
		);
		if (!combo) return "";
		return `Variante ${combo.ariaLabel} — `;
	};

	// Message de disponibilite pour ARIA live region
	const getAvailabilityMessage = () => {
		if (!selectedSku) {
			if (validationErrors.length > 0) {
				return validationErrors[0];
			}
			return "Choisis tes options pour voir la disponibilité";
		}
		const prefix = getSelectedVariantPrefix();
		if (selectedSku.inventory === 0 || !selectedSku.isActive) {
			return `${prefix}cette combinaison est en rupture de stock`;
		}
		if (selectedSku.inventory <= 3) {
			return `${prefix}plus que ${selectedSku.inventory} en stock`;
		}
		return `${prefix}en stock`;
	};

	/**
	 * Les axes sur lesquels un choix est OUVERT — pas ceux qui existent.
	 *
	 * La version précédente énumérait la structure du produit, jamais la sélection :
	 * comme une variante est auto-sélectionnée à l'arrivée (`page.tsx`, `skus[0]`),
	 * la carte affichait en permanence « Choisis la couleur pour continuer » alors
	 * que la pastille portait déjà son scotch, que le prix était exact et que le CTA
	 * disait « Ajouter au panier ». « pour continuer » annonçait un blocage inexistant.
	 *
	 * Le seuil de la couleur passe aussi de `> 0` à `> 1`, pour coller à
	 * `useVariantValidation.requiresColor` : une fiche à couleur unique et plusieurs
	 * tailles réclamait « la couleur », qui n'est pas un choix.
	 */
	const getChoosableAxes = () => {
		const axes: Array<{ missing: string; changeable: string }> = [];
		if (variantInfo.availableColors.length > 1)
			axes.push({ missing: "la couleur", changeable: "de couleur" });
		if (variantInfo.availableMaterials.length > 1)
			axes.push({ missing: "le matériau", changeable: "de matériau" });
		if (requiresSize && variantInfo.availableSizes.length > 0)
			axes.push({ missing: "la taille", changeable: "de taille" });
		return axes;
	};

	/** « a », « a et b », « a, b et c » — un `join` nu donnait « a et b et c ». */
	const enumerate = (parts: string[], last: string) =>
		parts.length <= 1
			? (parts[0] ?? "")
			: `${parts.slice(0, -1).join(", ")} ${last} ${parts[parts.length - 1]}`;

	const getDescription = () => {
		const axes = getChoosableAxes();
		if (axes.length === 0) return "";
		// Rien de sélectionné (aucun SKU ne correspond) : on redemande les axes.
		if (!selectedSku) {
			return `Choisis ${enumerate(
				axes.map((a) => a.missing),
				"et",
			)} pour continuer`;
		}
		// Une variante est retenue : on dit ce qui reste modifiable, sans injonction.
		return `Tu peux changer ${enumerate(
			axes.map((a) => a.changeable),
			"ou",
		)} quand tu veux.`;
	};

	// Vérifier si on doit afficher le sélecteur (plusieurs SKUs)
	const shouldShowSelector = product.skus.length > 1;

	// Ne rien afficher si produit avec un seul SKU
	if (!shouldShowSelector) return null;

	return (
		<Card
			id="sku-selector"
			role="region"
			aria-labelledby="variant-selector-title"
			className="group/sku-selector border-primary/20 border-2 shadow-sm"
		>
			<CardHeader>
				<CardTitle
					id="variant-selector-title"
					className="flex items-center gap-2 text-base/6 tracking-tight antialiased"
				>
					Choisis tes options
				</CardTitle>
				<CardDescription className="text-sm/6 tracking-normal antialiased">
					{getDescription() || "Choisis la variante que tu préfères"}
				</CardDescription>
				{/* ARIA live region pour annoncer les changements de disponibilite */}
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					{getAvailabilityMessage()}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Sélecteur de couleur autonome (mode combos M2M si disponible) */}
				<ColorSelector
					colors={variantInfo.availableColors}
					combos={variantInfo.availableCombos}
					product={product}
					showMaterialLabel={variantInfo.availableMaterials.length <= 1}
					defaultSku={defaultSku}
				/>

				{/* Sélecteur de matériau autonome */}
				{variantInfo.availableMaterials.length > 1 && (
					<>
						<Separator />
						<MaterialSelector
							materials={variantInfo.availableMaterials}
							product={product}
							defaultSku={defaultSku}
						/>
					</>
				)}

				{/* Sélecteur de taille autonome */}
				{requiresSize && variantInfo.availableSizes.length > 0 && (
					<>
						<Separator />
						<SizeSelector
							sizes={variantInfo.availableSizes}
							product={product}
							productTypeSlug={product.type?.slug}
							shouldShow
							defaultSku={defaultSku}
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
}

export function VariantSelector(props: ComponentProps<typeof VariantSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<VariantSelectorInner {...props} />
		</Suspense>
	);
}
