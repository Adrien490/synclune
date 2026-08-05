"use client";

import { useState, type ReactNode } from "react";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react/ssr";

import { SectionSearch, SEARCH_THRESHOLD } from "./filter-section-header";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Nombre d'entrées visibles par compartiment replié (« Le trieur ») : les
 * listes sont bornées, plus rien ne se replie — les 6 premières entrées sont
 * déjà triées par nombre de pièces par `ProductFilterCompartments`.
 */
export const COMPARTMENT_VISIBLE_COUNT = 6;

// ============================================================================
// TYPES
// ============================================================================

interface FilterOverflowListProps<T> {
	/** Entrées complètes, déjà triées (par compte décroissant). */
	items: T[];
	itemKey: (item: T) => string;
	renderItem: (item: T) => ReactNode;
	/** Libellé du bouton de dépli, reçoit le nombre d'entrées masquées. */
	moreLabel: (hidden: number) => string;
	/**
	 * Prédicat de recherche : l'active quand la liste est DÉPLIÉE et dépasse
	 * {@link SEARCH_THRESHOLD} entrées. Sans lui, pas de champ de recherche.
	 */
	matchesSearch?: (item: T, query: string) => boolean;
	searchPlaceholder?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Liste bornée à 6 entrées + « + N autres » qui déplie SUR PLACE (pas de
 * drill-down — arbitré deux fois). Le bouton reste monté après le dépli
 * (il devient « Réduire ») : le retirer du DOM lâcherait le focus clavier
 * sur `<body>`. Pas d'autoFocus au dépli (refus utilisateur).
 */
export function FilterOverflowList<T>({
	items,
	itemKey,
	renderItem,
	moreLabel,
	matchesSearch,
	searchPlaceholder = "Rechercher…",
}: FilterOverflowListProps<T>) {
	const [expanded, setExpanded] = useState(false);
	const [search, setSearch] = useState("");

	const hasOverflow = items.length > COMPARTMENT_VISIBLE_COUNT;
	const showSearch = expanded && matchesSearch !== undefined && items.length > SEARCH_THRESHOLD;

	const query = search.trim().toLowerCase();
	const visibleItems = expanded
		? showSearch && query
			? items.filter((item) => matchesSearch(item, query))
			: items
		: items.slice(0, COMPARTMENT_VISIBLE_COUNT);

	const hiddenCount = items.length - COMPARTMENT_VISIBLE_COUNT;

	return (
		<>
			{showSearch && (
				<SectionSearch value={search} onChange={setSearch} placeholder={searchPlaceholder} />
			)}
			<div className="space-y-1">
				{visibleItems.length === 0 ? (
					<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
				) : (
					visibleItems.map((item) => <div key={itemKey(item)}>{renderItem(item)}</div>)
				)}
				{hasOverflow && (
					<button
						key="overflow-toggle"
						type="button"
						onClick={() => {
							setExpanded((v) => !v);
							if (expanded) setSearch("");
						}}
						aria-expanded={expanded}
						className="text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-accent/50 focus-ring -mx-3 flex min-h-11 w-[calc(100%+1.5rem)] items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
					>
						{expanded ? (
							<CaretUpIcon className="size-3.5" aria-hidden="true" />
						) : (
							<CaretDownIcon className="size-3.5" aria-hidden="true" />
						)}
						{expanded ? "Réduire la liste" : moreLabel(hiddenCount)}
					</button>
				)}
			</div>
		</>
	);
}
