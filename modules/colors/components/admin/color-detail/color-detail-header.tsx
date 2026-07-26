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
		colorSlug: color.slug,
		colorDescription: color.description,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG.color}
			id={color.id}
			displayName={color.name}
			isActive={color.isActive}
			slug={color.slug}
			createdAt={color.createdAt}
			updatedAt={color.updatedAt}
			sections={sections}
			visual={
				<span
					className="border-border size-7 shrink-0 rounded-full border-2 shadow-sm"
					style={{ backgroundColor: color.hex }}
					aria-hidden="true"
				/>
			}
		/>
	);
}
