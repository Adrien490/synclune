"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { CreateTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";

export function CreateColorButton() {
	return <CreateTaxonomyButton config={TAXONOMY_CONFIG.color} />;
}
