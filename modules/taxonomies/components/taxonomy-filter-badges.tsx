"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";

import { TAXONOMY_CONFIG } from "../config/taxonomy.config";
import type { TaxonomyKind } from "../types/taxonomy.types";

/**
 * Badges de filtres actifs des listes de taxonomies.
 *
 * Le libellé vient du registre : `badgeLabel` pour le nom du filtre, le
 * `label` de l'option pour la valeur.
 *
 * ⚠️ `filter.key` porte le préfixe (`filter_hasProducts`), pas le suffixe. Le
 * comparer sans le retirer — ou le retirer et comparer à autre chose que le
 * `param` du registre — fait tomber le badge dans son cas par défaut, où il
 * rend la clé technique : « isActive : true » s'est affiché ainsi pendant des
 * mois, y compris dans le nom accessible du bouton de retrait.
 */
export function TaxonomyFilterBadges({ kind }: { kind: TaxonomyKind }) {
	const config = TAXONOMY_CONFIG[kind];

	const formatFilter = (filter: FilterDefinition) => {
		const param = filter.key.replace("filter_", "");
		const value = String(filter.value);
		const definition = config.filters.find((candidate) => candidate.param === param);

		if (!definition) return { label: param, displayValue: value };

		const option = definition.options.find((candidate) => candidate.value === value);
		return { label: definition.badgeLabel, displayValue: option?.label ?? value };
	};

	return <FilterBadges formatFilter={formatFilter} />;
}
