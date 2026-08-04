"use client";

import { FunnelXIcon, MagnifyingGlassMinusIcon } from "@phosphor-icons/react/ssr";
import { useSearchParams } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { useFilter } from "@/shared/hooks/use-filter";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

/**
 * CTA de sortie de l'état « aucun résultat » du catalogue storefront.
 *
 * ## Pourquoi
 *
 * Les 11 listes admin offrent automatiquement « Réinitialiser les filtres » quand
 * `hasActiveFilters` (via `TableEmptyState` + `EmptyResetFiltersAction`). Le
 * catalogue storefront filtré-vide n'offrait **rien** : le texte disait « Essayez
 * de modifier vos filtres » sans aucun moyen de le faire depuis l'état vide, et le
 * « Tout effacer » de `filter-badges.tsx` ne s'affiche qu'au-dessus de la liste,
 * là où les badges sont rendus. C'était la principale asymétrie storefront/admin
 * de l'audit « Système de feedback ».
 *
 * ## Composant client autonome
 *
 * Il décide seul de son affichage à partir de l'URL (`useFilter` +
 * `useSearchParams`), donc `SearchFallbackSuggestions` (Server Component) n'a
 * aucun état à lui passer et ne peut pas se désynchroniser.
 *
 * ⚠️ `filterPrefix: ""` — même configuration que `filter-badges.tsx`, qui est ce
 * qui fait que `clearAllFiltersOptimistic()` remet à zéro **tous** les paramètres
 * (filtres, recherche, tri, pagination). C'est le comportement voulu ici : sur une
 * page sans résultat, on veut repartir d'un catalogue complet. Le libellé s'adapte
 * pour ne pas mentir sur ce qui va être effacé.
 */
export function ResetSearchFiltersAction() {
	const searchParams = useSearchParams();
	const { optimisticActiveFilters, clearAllFiltersOptimistic } = useFilter({ filterPrefix: "" });

	const hasFilters = optimisticActiveFilters.length > 0;
	const hasSearch = Boolean(searchParams.get("search"));

	// Rien à réinitialiser : l'état vide vient d'un catalogue réellement vide, pas
	// d'un filtrage trop restrictif. Les suggestions en dessous suffisent.
	if (!hasFilters && !hasSearch) return null;

	const label = hasFilters ? "Réinitialiser les filtres" : "Effacer la recherche";
	const Icon = hasFilters ? FunnelXIcon : MagnifyingGlassMinusIcon;

	return (
		<Button
			variant="outline"
			onClick={() => {
				triggerHaptic("light");
				clearAllFiltersOptimistic();
			}}
		>
			<Icon aria-hidden="true" />
			{label}
		</Button>
	);
}
