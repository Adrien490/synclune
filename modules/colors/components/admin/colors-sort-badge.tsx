"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomySortBadge } from "@/modules/taxonomies/components/taxonomy-list-controls";

export function ColorsSortBadge() {
	return <TaxonomySortBadge config={TAXONOMY_CONFIG.color} />;
}
