"use client";

import type { ComponentProps } from "react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyFilterSheet } from "@/modules/taxonomies/components/taxonomy-filter-sheet";

type ProductTypesFilterSheetProps = Omit<ComponentProps<typeof TaxonomyFilterSheet>, "config">;

export function ProductTypesFilterSheet(props: ProductTypesFilterSheetProps) {
	return <TaxonomyFilterSheet config={TAXONOMY_CONFIG["product-type"]} {...props} />;
}
