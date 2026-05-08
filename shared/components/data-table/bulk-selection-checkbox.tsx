"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useBulkSelectionContext } from "./bulk-selection-context";

interface BulkSelectionRowCheckboxProps {
	id: string;
	itemLabel?: string;
}

/**
 * Checkbox per-row pour bulk selection. À placer dans la première colonne.
 * Stop la propagation pour ne pas déclencher la nav du Link parent.
 */
export function BulkSelectionRowCheckbox({ id, itemLabel }: BulkSelectionRowCheckboxProps) {
	const { isSelected, toggle } = useBulkSelectionContext();
	const checked = isSelected(id);

	return (
		<Checkbox
			checked={checked}
			onCheckedChange={() => {
				triggerHaptic("selection");
				toggle(id);
			}}
			onClick={(event) => event.stopPropagation()}
			aria-label={
				itemLabel
					? `${checked ? "Désélectionner" : "Sélectionner"} ${itemLabel}`
					: checked
						? "Désélectionner cette ligne"
						: "Sélectionner cette ligne"
			}
		/>
	);
}

/**
 * Checkbox header pour select-all-page (tri-state none/some/all).
 */
export function BulkSelectionHeaderCheckbox({ itemsLabel = "lignes" }: { itemsLabel?: string }) {
	const { pageState, togglePage, pageItemIds } = useBulkSelectionContext();

	if (pageItemIds.length === 0) return null;

	const checked: boolean | "indeterminate" =
		pageState === "all" ? true : pageState === "some" ? "indeterminate" : false;

	return (
		<Checkbox
			checked={checked}
			onCheckedChange={() => {
				triggerHaptic("selection");
				togglePage();
			}}
			aria-label={
				pageState === "all"
					? `Désélectionner ${itemsLabel} de la page`
					: `Sélectionner ${itemsLabel} de la page`
			}
		/>
	);
}
