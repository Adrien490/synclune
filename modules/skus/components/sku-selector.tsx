"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Sparkles } from "lucide-react";
import { extractVariantInfo } from "@/modules/skus/services/extract-sku-info";
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
export function VariantSelector({ product, defaultSku }: VariantSelectorProps) {
	const searchParams = useSearchParams();

	// Lire l'état depuis l'URL pour la validation
	const variants = {
		color: searchParams.get("color"),
		material: searchParams.get("material"),
		size: searchParams.get("size"),
	};

	// Déterminer si la taille est requise
	const { requiresSize, validationErrors } = useVariantValidation({ product, selection: variants });

	// Calculer les variantes disponibles depuis le produit
	const variantInfo = extractVariantInfo(product);

	// SKU selectionne pour le message de disponibilite
	const { selectedSku } = useSelectedSku({ product, defaultSku });

	// Message de disponibilite pour ARIA live region
	const getAvailabilityMessage = () => {
		if (!selectedSku) {
			if (validationErrors.length > 0) {
				return validationErrors[0];
			}
			return "Selectionne tes options pour voir la disponibilite";
		}
		if (selectedSku.inventory === 0 || !selectedSku.isActive) {
			return "Cette combinaison est en rupture de stock";
		}
		if (selectedSku.inventory <= 3) {
			return `Plus que ${selectedSku.inventory} en stock`;
		}
		return "En stock";
	};

	// Description dynamique selon les selecteurs affiches
	const getDescription = () => {
		const parts = [];
		if (variantInfo.availableColors.length > 0) parts.push("la couleur");
		if (variantInfo.availableMaterials.length > 1) parts.push("le materiau");
		if (requiresSize && variantInfo.availableSizes.length > 0) parts.push("la taille");
		if (parts.length === 0) return "";
		return `Selectionne ${parts.join(" et ")} pour continuer`;
	};

	// Vérifier si on doit afficher le sélecteur (plusieurs SKUs)
	const shouldShowSelector = product.skus && product.skus.length > 1;

	// Ne rien afficher si produit avec un seul SKU
	if (!shouldShowSelector) return null;

	return (
		<Card role="region" aria-labelledby="variant-selector-title" className="group/sku-selector border-2 border-primary/20 shadow-sm">
			<CardHeader>
				<CardTitle
					id="variant-selector-title"
					className="text-base/6 tracking-tight antialiased flex items-center gap-2"
				>
					<Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
					Choisis tes options
				</CardTitle>
				<CardDescription className="text-sm/6 tracking-normal antialiased">
					{getDescription() || "Selectionne tes options"}
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
							shouldShow={requiresSize && variantInfo.availableSizes.length > 0}
							defaultSku={defaultSku}
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
}
