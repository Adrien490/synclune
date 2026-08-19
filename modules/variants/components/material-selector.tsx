"use client";

import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import type { Material } from "@/modules/variants/types/variant-selector.types";

import { VariantOptionGroup } from "./variant-option-group";

interface MaterialSelectorProps {
	materials: Material[];
	product: GetProductReturn;
	defaultVariant?: ProductVariant;
}

/**
 * Sélecteur de matériau — mécanique partagée avec le sélecteur de taille
 * (`VariantOptionGroup`). Ne décide que de ses propres axes.
 */
function MaterialSelectorInner({ materials, product, defaultVariant }: MaterialSelectorProps) {
	const searchParams = useSearchParams();

	// Un seul matériau (ou aucun) n'est pas un choix.
	if (materials.length <= 1) return null;

	return (
		<VariantOptionGroup
			legend="Matériau"
			paramName="material"
			options={materials.map((material) => ({ id: material.name, label: material.name }))}
			product={product}
			fallbackValue={defaultVariant?.material?.name}
			layout="row"
			buildSelectors={(materialName) => ({
				colorSlug: searchParams.get("color") ?? undefined,
				materialSlug: materialName,
				size: searchParams.get("size") ?? undefined,
			})}
		/>
	);
}

export function MaterialSelector(props: ComponentProps<typeof MaterialSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<MaterialSelectorInner {...props} />
		</Suspense>
	);
}
