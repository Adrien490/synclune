"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { extractVariantInfo } from "@/modules/skus/services/extract-sku-info";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { useSearchParams } from "next/navigation";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import { ColorSelector } from "@/modules/colors/components/color-selector";
import { MaterialSelector } from "@/modules/skus/components/material-selector";
import { SizeSelector } from "@/modules/skus/components/size-selector";

interface VariantSelectorProps {
	product: GetProductReturn;
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
export function VariantSelector({ product }: VariantSelectorProps) {
	const searchParams = useSearchParams();

	// Lire l'état depuis l'URL pour la validation
	const variants = {
		color: searchParams.get("color"),
		material: searchParams.get("material"),
		size: searchParams.get("size"),
	};

	// Déterminer si la taille est requise
	const { requiresSize } = useVariantValidation({ product, selection: variants });

	// Calculer les variantes disponibles depuis le produit
	const variantInfo = extractVariantInfo(product);

	// Vérifier si on doit afficher le sélecteur (plusieurs SKUs)
	const shouldShowSelector = product.skus && product.skus.length > 1;

	// Ne rien afficher si produit avec un seul SKU
	if (!shouldShowSelector) return null;

	return (
		<Card role="region" aria-labelledby="variant-selector-title">
			<CardHeader>
				<CardTitle
					id="variant-selector-title"
					className="text-base/6 tracking-tight antialiased flex items-center gap-2"
				>
					<span className="text-primary" aria-hidden="true">
						✨
					</span>
					Personnalise ton bijou
				</CardTitle>
				<CardDescription className="text-sm/6 tracking-normal antialiased">
					Chaque détail compte pour créer TA pièce unique
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Sélecteur de couleur autonome */}
				<ColorSelector
					colors={variantInfo.availableColors}
					product={product}
					showMaterialLabel={variantInfo.availableMaterials.length <= 1}
				/>

				{/* Sélecteur de matériau autonome */}
				{variantInfo.availableMaterials.length > 1 && (
					<>
						<Separator />
						<MaterialSelector
							materials={variantInfo.availableMaterials}
							product={product}
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
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
}
