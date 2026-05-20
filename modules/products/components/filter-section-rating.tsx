"use client";

import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { RatingStars } from "@/shared/components/rating-stars";
import { useHaptic } from "@/shared/hooks/use-haptic";

// ============================================================================
// TYPES
// ============================================================================

interface RatingFilterSectionProps {
	selectedValue: number | null;
	onChange: (value: number | null) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps de la section "Notes clients" du filtre produit.
 *
 * Options mutuellement exclusives (une seule note minimale) → groupe radio
 * pour une sémantique et une annonce lecteur d'écran correctes. L'effacement
 * passe par le bouton reset de l'en-tête de section.
 */
export function RatingFilterSection({ selectedValue, onChange }: RatingFilterSectionProps) {
	const haptic = useHaptic();

	return (
		<div role="radiogroup" aria-label="Note minimale" className="space-y-1">
			{[5, 4, 3, 2, 1].map((stars) => (
				<RadioFilterItem
					key={stars}
					id={`rating-${stars}`}
					name="product-filter-rating"
					value={String(stars)}
					checked={selectedValue === stars}
					onCheckedChange={() => {
						haptic("selection");
						onChange(stars);
					}}
				>
					<span className="flex items-center gap-2">
						<RatingStars rating={stars} size="sm" />
						<span>{stars === 1 ? "1 étoile et plus" : `${stars} étoiles et plus`}</span>
					</span>
				</RadioFilterItem>
			))}
		</div>
	);
}
