"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Checkbox } from "./ui/checkbox";

interface ItemCheckboxProps {
	itemId: string;
	/** Label contextuel pour l'accessibilité (ex: nom du produit) */
	ariaLabel?: string;
}

export function ItemCheckbox({ itemId, ariaLabel }: ItemCheckboxProps) {
	const { isSelected, handleItemSelectionChange } = useSelectionContext();
	const checked = isSelected(itemId);

	return (
		<Checkbox
			checked={checked}
			onCheckedChange={(checked) => {
				handleItemSelectionChange(itemId, checked === true);
			}}
			aria-label={ariaLabel || `Sélectionner l'élément ${itemId}`}
		/>
	);
}
