"use client";

import type { ComponentProps } from "react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyFilterSheet } from "@/modules/taxonomies/components/taxonomy-filter-sheet";

type ColorsFilterSheetProps = Omit<ComponentProps<typeof TaxonomyFilterSheet>, "config">;

export function ColorsFilterSheet(props: ColorsFilterSheetProps) {
	return <TaxonomyFilterSheet config={TAXONOMY_CONFIG.color} {...props} />;
}
