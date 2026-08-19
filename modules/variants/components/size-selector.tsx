"use client";

import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import type { Size } from "@/modules/variants/types/variant-selector.types";
import {
	SYSTEM_PRODUCT_TYPE_SLUGS,
	isProductType,
} from "@/modules/product-types/constants/system-product-type-slugs";
import dynamic from "next/dynamic";

import { VariantOptionGroup } from "./variant-option-group";

// Lazy loading - dialog chargé uniquement à l'ouverture
const SizeGuideDialog = dynamic(() =>
	import("./size-guide-dialog").then((mod) => mod.SizeGuideDialog),
);

interface SizeSelectorProps {
	sizes: Size[];
	product: GetProductReturn;
	shouldShow: boolean;
	defaultVariant?: ProductVariant;
	productTypeSlug?: string | null;
}

/** Label adapté au type de produit — SSOT des slugs système. */
function getSizeLegend(productTypeSlug?: string | null): string {
	if (isProductType(productTypeSlug, SYSTEM_PRODUCT_TYPE_SLUGS.RINGS)) return "Taille (Diamètre)";
	if (isProductType(productTypeSlug, SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS)) {
		return "Taille (Tour de poignet)";
	}
	return "Taille";
}

/**
 * Sélecteur de taille — la mécanique (URL, disponibilité, clavier, optimiste)
 * vit dans `VariantOptionGroup`, partagée avec le sélecteur de matériau.
 * Ce composant ne décide plus que ce qui lui est propre : le libellé selon le
 * type de produit, le guide des tailles et les axes à croiser.
 */
function SizeSelectorInner({
	sizes,
	product,
	shouldShow,
	defaultVariant,
	productTypeSlug,
}: SizeSelectorProps) {
	const searchParams = useSearchParams();

	if (!shouldShow || sizes.length === 0) return null;

	return (
		<VariantOptionGroup
			legend={getSizeLegend(productTypeSlug)}
			paramName="size"
			options={sizes.map((size) => ({ id: size.size, label: size.size }))}
			product={product}
			fallbackValue={defaultVariant?.size}
			layout="tile"
			headerAction={<SizeGuideDialog productTypeSlug={productTypeSlug} />}
			getOptionAriaLabel={(option) => `Taille ${option.label}`}
			buildSelectors={(size) => ({
				colorSlug: readParam(searchParams, "color"),
				materialSlug: readParam(searchParams, "material"),
				size,
			})}
		/>
	);
}

function readParam(searchParams: ReadonlyURLSearchParams, key: string): string | undefined {
	return searchParams.get(key) ?? undefined;
}

export function SizeSelector(props: ComponentProps<typeof SizeSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<SizeSelectorInner {...props} />
		</Suspense>
	);
}
