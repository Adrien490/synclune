"use client";

import { ShapesIcon } from "@phosphor-icons/react/ssr";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyDetailHeader } from "@/modules/taxonomies/components/taxonomy-detail-header";
import { useProductTypeActions } from "@/modules/product-types/hooks/use-product-type-actions";
import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";

interface ProductTypeDetailHeaderProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailHeader({ productType }: ProductTypeDetailHeaderProps) {
	const { sections } = useProductTypeActions({
		productTypeId: productType.id,
		label: productType.label,
		slug: productType.slug,
		productsCount: productType._count.products,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG["product-type"]}
			id={productType.id}
			displayName={productType.label}
			sections={sections}
			visual={<ShapesIcon className="text-muted-foreground size-7 shrink-0" aria-hidden="true" />}
		/>
	);
}
