"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyFilterBadges } from "@/modules/taxonomies/components/taxonomy-filter-badges";

export function ColorsFilterBadges() {
	return <TaxonomyFilterBadges config={TAXONOMY_CONFIG.color} />;
}
