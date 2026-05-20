"use client";

import { Switch } from "@/shared/components/ui/switch";
import { useHaptic } from "@/shared/hooks/use-haptic";

// ============================================================================
// TYPES
// ============================================================================

interface AvailabilityFilterSectionProps {
	inStockOnly: boolean;
	onSale: boolean;
	onInStockChange: (checked: boolean) => void;
	onSaleChange: (checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps de la section "Disponibilité" du filtre produit.
 * Rendu dans un panneau du menu drill-down (sans coquille accordéon).
 */
export function AvailabilityFilterSection({
	inStockOnly,
	onSale,
	onInStockChange,
	onSaleChange,
}: AvailabilityFilterSectionProps) {
	const haptic = useHaptic();

	return (
		<div className="space-y-1">
			<label
				htmlFor="filter-in-stock"
				className="hover:bg-accent/50 -mx-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150"
			>
				<span className="text-sm font-normal">En stock uniquement</span>
				<Switch
					id="filter-in-stock"
					checked={inStockOnly}
					onCheckedChange={(checked) => {
						haptic("selection");
						onInStockChange(checked);
					}}
					aria-label="Afficher uniquement les produits en stock"
				/>
			</label>
			<label
				htmlFor="filter-on-sale"
				className="hover:bg-accent/50 -mx-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150"
			>
				<span className="text-sm font-normal">En promotion</span>
				<Switch
					id="filter-on-sale"
					checked={onSale}
					onCheckedChange={(checked) => {
						haptic("selection");
						onSaleChange(checked);
					}}
					aria-label="Afficher uniquement les produits en promotion"
				/>
			</label>
		</div>
	);
}
