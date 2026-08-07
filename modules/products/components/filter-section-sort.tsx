"use client";

import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { PRODUCTS_DEFAULT_SORT } from "@/modules/products/constants/product.constants";
import type { SortOption } from "@/shared/types/sort.types";
import { cn } from "@/shared/utils/cn";

// ============================================================================
// TYPES
// ============================================================================

interface SortFilterSectionProps {
	/** Préfixe des `id` DOM — cf. `ProductFilterCompartments.host`. */
	idPrefix: string;
	/** Options de tri, dans l'ordre d'affichage (SSOT `PRODUCTS_SORT_OPTIONS`). */
	options: SortOption[];
	/** Tri courant (`values.sortBy`). */
	value: string;
	onChange: (value: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps du compartiment « Trier par » — le tri vit DANS le meuble de filtres
 * (rail desktop + panneau mobile) depuis le retrait de la barre d'outils
 * (2026-08-06) : plus de menu ancré ni de tiroir dédié, une liste radio
 * toujours visible.
 *
 * Les lignes portent la même parité survol ⇔ focus que les lignes à cases
 * (`checkbox-filter-item`) et la même zone tactile 44 px. Comme l'ancien menu,
 * la ligne par défaut est cochée pour l'URL nue COMME pour
 * `?sortBy=created-descending` (la normalisation vit dans
 * `parseFilterValuesFromURL`), et la choisir EFFACE le paramètre
 * (`buildFilterURL`) au lieu d'écrire la valeur par défaut.
 *
 * ⚠️ Le nom accessible de chaque radio vient du libellé VISIBLE, par
 * `aria-labelledby` — même règle WCAG 2.5.3 que les interrupteurs de
 * disponibilité.
 */
export function SortFilterSection({ idPrefix, options, value, onChange }: SortFilterSectionProps) {
	const haptic = useHaptic();

	return (
		<RadioGroup
			value={value}
			onValueChange={(next) => {
				if (typeof next !== "string" || next === value) return;
				haptic("selection");
				onChange(next);
			}}
			className="gap-1"
		>
			{options.map((option) => {
				const id = `${idPrefix}-sort-${option.value}`;
				const isSelected = option.value === value;

				return (
					<label
						key={option.value}
						htmlFor={id}
						className={cn(
							"-mx-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
							"transition-colors duration-150",
							"can-hover:hover:bg-accent/50 has-focus-visible:bg-accent/50",
							isSelected && "bg-primary/5",
						)}
					>
						<RadioGroupItem
							id={id}
							value={option.value}
							aria-labelledby={`${id}-label`}
							className="shrink-0"
						/>
						<span id={`${id}-label`} className="min-w-0 flex-1 text-sm font-normal">
							{option.label}
						</span>
						{option.value === PRODUCTS_DEFAULT_SORT && (
							<span className="text-muted-foreground shrink-0 text-xs">par défaut</span>
						)}
					</label>
				);
			})}
		</RadioGroup>
	);
}
