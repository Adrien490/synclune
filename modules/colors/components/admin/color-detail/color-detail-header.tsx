"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyDetailHeader } from "@/modules/taxonomies/components/taxonomy-detail-header";
import { useColorActions } from "@/modules/colors/hooks/use-color-actions";
import type { ColorDetailReturn } from "@/modules/colors/data/get-color";

interface ColorDetailHeaderProps {
	color: ColorDetailReturn;
}

export function ColorDetailHeader({ color }: ColorDetailHeaderProps) {
	const { sections } = useColorActions({
		colorId: color.id,
		colorName: color.name,
		colorHex: color.hex,
		// `_count.variants` est filtré sur `active` (KPI de la carte de stats) ;
		// la garde de suppression veut le total.
		variantsCount: color.totalVariantCount,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG.color}
			id={color.id}
			displayName={color.name}
			sections={sections}
			visual={
				<span
					className="border-border size-7 shrink-0 rounded-full border-2 shadow-sm"
					style={{ backgroundColor: color.hex ?? undefined }}
					aria-hidden="true"
				/>
			}
		/>
	);
}
