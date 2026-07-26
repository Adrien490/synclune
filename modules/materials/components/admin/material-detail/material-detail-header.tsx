"use client";

import { Gem } from "lucide-react";

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
		materialSlug: material.slug,
		materialDescription: material.description,
		materialIsActive: material.isActive,
	});

	return (
		<TaxonomyDetailHeader
			config={TAXONOMY_CONFIG.material}
			id={material.id}
			displayName={material.name}
			isActive={material.isActive}
			slug={material.slug}
			createdAt={material.createdAt}
			updatedAt={material.updatedAt}
			sections={sections}
			visual={<Gem className="text-muted-foreground size-7 shrink-0" aria-hidden="true" />}
		/>
	);
}
