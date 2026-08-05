"use client";

import { Input } from "@/shared/components/ui/input";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

// ============================================================================
// SECTION SEARCH
// ============================================================================

interface SectionSearchProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

/**
 * Champ de recherche affiché en tête des listes de filtre longues, une fois
 * dépliées (couleurs / matériaux au-delà de {@link SEARCH_THRESHOLD} entrées) —
 * cf. `FilterOverflowList`, qui décide de son affichage.
 *
 * ⚠️ Pas d'autoFocus au dépli (refus utilisateur).
 */
export function SectionSearch({
	value,
	onChange,
	placeholder = "Rechercher…",
}: SectionSearchProps) {
	return (
		<div className="relative mb-2">
			<MagnifyingGlassIcon
				className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
				aria-hidden="true"
			/>
			<Input
				type="search"
				inputMode="search"
				enterKeyHint="search"
				autoComplete="off"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				// 44 px comme toute cible du panneau (lignes de filtre, boutons de
				// dépli, bouton d'application) — c'était le seul contrôle à 40.
				className="h-11 pr-3 pl-8 text-xs"
			/>
		</div>
	);
}

// Threshold for showing search input in filter sections
export const SEARCH_THRESHOLD = 8;
