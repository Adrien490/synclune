"use client";

import type { ComponentProps } from "react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyFilterSheet } from "@/modules/taxonomies/components/taxonomy-filter-sheet";

type MaterialsFilterSheetProps = Omit<ComponentProps<typeof TaxonomyFilterSheet>, "config">;

export function MaterialsFilterSheet(props: MaterialsFilterSheetProps) {
	return <TaxonomyFilterSheet config={TAXONOMY_CONFIG.material} {...props} />;
}
