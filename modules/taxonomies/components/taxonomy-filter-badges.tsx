"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";

import { agree, TAXONOMY_CONFIG } from "../config/taxonomy.config";
import type { TaxonomyKind } from "../types/taxonomy.types";

/**
 * Badges de filtres actifs des listes de taxonomies.
 *
 * Le seul filtre est le statut. Les trois modules l'affichaient différemment
 * (« Actives » au pluriel féminin, « Actifs », « Actif » au singulier) ; on
 * retient le singulier accordé, cohérent avec la feuille de filtres.
 */

/**
 * ⚠️ Prend un `kind` (chaîne), pas l'objet `config`.
 *
 * Ce composant est `"use client"` et monté depuis des Server Components : un
 * `TaxonomyConfig` passé en prop traverserait la frontière RSC — ~40 champs
 * sérialisés à chaque rendu, pour une valeur que le client peut lire seul dans
 * le registre. Le `kind` fait cinq caractères sur le fil.
 *
 * C'est aussi ce qui a permis de supprimer les fichiers-liants d'un composant
 * (`colors-bottom-bar.tsx` et ses quatorze jumeaux, 8 à 13 lignes chacun) dont
 * le corps entier était `return <Taxonomy… config={TAXONOMY_CONFIG.x} />`.
 */
export function TaxonomyFilterBadges({ kind }: { kind: TaxonomyKind }) {
	const config = TAXONOMY_CONFIG[kind];

	const formatFilter = (filter: FilterDefinition) => {
		const filterKey = filter.key.replace("filter_", "");
		const value = filter.value as string;

		if (filterKey === "isActive") {
			return formatStatusFilter(value, agree(config, "Actif"), agree(config, "Inactif"));
		}

		return { label: filterKey, displayValue: value };
	};

	return <FilterBadges formatFilter={formatFilter} />;
}
