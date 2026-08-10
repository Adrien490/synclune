"use client";

import { Switch } from "@/shared/components/ui/switch";
import { useHaptic } from "@/shared/hooks/use-haptic";

// ============================================================================
// TYPES
// ============================================================================

interface AvailabilityFilterSectionProps {
	/** Préfixe des `id` DOM — cf. `ProductFilterCompartments.host`. */
	idPrefix: string;
	inStockOnly: boolean;
	onInStockChange: (checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps du compartiment « Disponibilité » du panneau de filtres.
 *
 * ⚠️ La ligne « En promotion » a été retirée (retrait Omnibus 2026-08-08,
 * cf. `ProductPrice`) : la facette triait sur un critère devenu invisible.
 *
 * La ligne porte la même parité survol ⇔ focus que les lignes à cases
 * (`checkbox-filter-item`) : le survol est gaté `can-hover:` (sticky-hover iOS)
 * et le focus clavier reçoit la même teinte, jamais derrière ce gate.
 *
 * ⚠️ Le nom accessible des interrupteurs vient du libellé VISIBLE, par
 * `aria-labelledby`. Un `aria-label` rédigé (« Afficher uniquement les produits
 * en stock ») écrasait l'association `<label htmlFor>` et ne contenait pas le
 * texte visible « En stock uniquement » — donc WCAG 2.5.3 Label in Name en
 * échec, et une commande vocale « clique sur En stock uniquement » sans cible.
 */
export function AvailabilityFilterSection({
	idPrefix,
	inStockOnly,
	onInStockChange,
}: AvailabilityFilterSectionProps) {
	const haptic = useHaptic();

	const rowClassName =
		"can-hover:hover:bg-accent/50 has-focus-visible:bg-accent/50 -mx-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150";

	const inStockId = `${idPrefix}-filter-in-stock`;

	return (
		<div className="space-y-1">
			<label htmlFor={inStockId} className={rowClassName}>
				<span id={`${inStockId}-label`} className="text-sm font-normal">
					En stock uniquement
				</span>
				<Switch
					id={inStockId}
					checked={inStockOnly}
					onCheckedChange={(checked) => {
						haptic("selection");
						onInStockChange(checked);
					}}
					aria-labelledby={`${inStockId}-label`}
				/>
			</label>
		</div>
	);
}
