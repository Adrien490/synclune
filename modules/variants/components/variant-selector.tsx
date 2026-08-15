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
import { extractVariantInfo } from "@/modules/variants/services/variant-info-extraction.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import { useSearchParams } from "next/navigation";
import { useVariantValidation } from "@/modules/variants/hooks/use-variant-validation";
import { useSelectedVariant } from "@/modules/variants/hooks/use-selected-variant";
import { ColorSelector } from "@/modules/colors/components/color-selector";
import { MaterialSelector } from "@/modules/variants/components/material-selector";
import { SizeSelector } from "@/modules/variants/components/size-selector";

interface VariantSelectorProps {
	product: GetProductReturn;
	defaultVariant?: ProductVariant;
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
function VariantSelectorInner({ product, defaultVariant }: VariantSelectorProps) {
	const searchParams = useSearchParams();

	// Lire l'état depuis l'URL pour la validation (schéma lean : la couleur est
	// pilotée par `?color=<slug>`, slug = nom de couleur slugifié).
	const variants = {
		color: searchParams.get("color"),
		material: searchParams.get("material"),
		size: searchParams.get("size"),
	};

	// Déterminer si la taille est requise
	const { requiresSize, validationErrors } = useVariantValidation({ product, selection: variants });

	// Calculer les variantes disponibles depuis le produit
	const variantInfo = extractVariantInfo(product);

	// VARIANT selectionne pour le message de disponibilite
	const { selectedVariant } = useSelectedVariant({ product, defaultVariant });

	// Préfixe le message de disponibilité par la couleur sélectionnée pour que
	// les lecteurs d'écran annoncent « Variante Or rose en stock » plutôt qu'un
	// « En stock » contextuellement pauvre.
	const getSelectedVariantPrefix = () => {
		if (!selectedVariant) return "";
		const label = selectedVariant.color?.name ?? selectedVariant.material?.name;
		if (!label) return "";
		return `Variante ${label} — `;
	};

	// Message de disponibilite pour ARIA live region
	const getAvailabilityMessage = () => {
		if (!selectedVariant) {
			if (validationErrors.length > 0) {
				return validationErrors[0];
			}
			return "Choisis tes options pour voir la disponibilité";
		}
		const prefix = getSelectedVariantPrefix();
		if (selectedVariant.stock === 0 || !selectedVariant.active) {
			return `${prefix}cette combinaison est en rupture de stock`;
		}
		if (selectedVariant.stock <= 3) {
			return `${prefix}plus que ${selectedVariant.stock} en stock`;
		}
		return `${prefix}en stock`;
	};

	/**
	 * Les axes sur lesquels un choix est OUVERT — pas ceux qui existent.
	 *
	 * La version précédente énumérait la structure du produit, jamais la sélection :
	 * comme une variante est auto-sélectionnée à l'arrivée (`page.tsx`, `variants[0]`),
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
		// Rien de sélectionné (aucun VARIANT ne correspond) : on redemande les axes.
		if (!selectedVariant) {
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

	// Vérifier si on doit afficher le sélecteur (plusieurs VARIANTs)
	const shouldShowSelector = product.variants.length > 1;

	// Ne rien afficher si produit avec un seul VARIANT
	if (!shouldShowSelector) return null;

	return (
		<Card
			id="variant-selector"
			role="region"
			aria-labelledby="variant-selector-title"
			className="group/variant-selector border-primary/20 border-2 shadow-sm"
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
				{/* Sélecteur de couleur autonome */}
				<ColorSelector
					colors={variantInfo.availableColors}
					product={product}
					showMaterialLabel={variantInfo.availableMaterials.length <= 1}
					defaultVariant={defaultVariant}
				/>

				{/* Sélecteur de matériau autonome */}
				{variantInfo.availableMaterials.length > 1 && (
					<>
						<Separator />
						<MaterialSelector
							materials={variantInfo.availableMaterials}
							product={product}
							defaultVariant={defaultVariant}
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
							shouldShow
							defaultVariant={defaultVariant}
							productTypeSlug={product.type?.slug}
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
