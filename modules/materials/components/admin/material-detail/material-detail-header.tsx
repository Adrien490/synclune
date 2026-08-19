"use client";

import { SwatchesIcon } from "@phosphor-icons/react/ssr";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyDetailHeader } from "@/modules/taxonomies/components/taxonomy-detail-header";
import { useMaterialActions } from "@/modules/materials/hooks/use-material-actions";
import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";

interface MaterialDetailHeaderProps {
	material: MaterialDetailReturn;
}

export function MaterialDetailHeader({ material }: MaterialDetailHeaderProps) {
	const { sections } = useMaterialActions({
		materialId: material.id,
		materialName: material.name,
		// `_count.variants` est filtré sur `active` (KPI de la carte de stats) ;
		// la garde de suppression veut le total.
		variantsCount: material.totalVariantCount,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG.material}
			id={material.id}
			displayName={material.name}
			sections={sections}
			visual={<SwatchesIcon className="text-muted-foreground size-7 shrink-0" aria-hidden="true" />}
		/>
	);
}
