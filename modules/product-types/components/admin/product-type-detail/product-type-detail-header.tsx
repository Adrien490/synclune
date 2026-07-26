"use client";

import { Lock, Tags } from "lucide-react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyDetailHeader } from "@/modules/taxonomies/components/taxonomy-detail-header";
import { useProductTypeActions } from "@/modules/product-types/hooks/use-product-type-actions";
import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";
import { Badge } from "@/shared/components/ui/badge";

interface ProductTypeDetailHeaderProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailHeader({ productType }: ProductTypeDetailHeaderProps) {
	const { sections } = useProductTypeActions({
		productTypeId: productType.id,
		isSystem: productType.isSystem,
		label: productType.label,
		description: productType.description,
		slug: productType.slug,
		productsCount: productType._count.products,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG["product-type"]}
			id={productType.id}
			displayName={productType.label}
			isActive={productType.isActive}
			slug={productType.slug}
			createdAt={productType.createdAt}
			updatedAt={productType.updatedAt}
			sections={sections}
			visual={<Tags className="text-muted-foreground size-7 shrink-0" aria-hidden="true" />}
			editDisabled={productType.isSystem}
			extraBadges={
				productType.isSystem ? (
					<Badge variant="outline" className="shrink-0 gap-1">
						<Lock className="size-3" aria-hidden="true" />
						Système
					</Badge>
				) : null
			}
		/>
	);
}
