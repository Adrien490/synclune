"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyBottomBar } from "@/modules/taxonomies/components/taxonomy-bottom-bar";

export function ColorsBottomBar() {
	return <TaxonomyBottomBar config={TAXONOMY_CONFIG.color} />;
}
