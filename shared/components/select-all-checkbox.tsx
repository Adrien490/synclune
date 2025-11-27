"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Checkbox } from "./ui/checkbox";

interface SelectAllCheckboxProps {
	itemIds: string[];
}

export function SelectAllCheckbox({ itemIds }: SelectAllCheckboxProps) {
	const { areAllSelected, handleSelectionChange } = useSelectionContext();
	const allSelected = areAllSelected(itemIds);

	return (
		<Checkbox
			checked={allSelected}
			onCheckedChange={(checked) => {
				handleSelectionChange(itemIds, checked === true);
			}}
			aria-label="Tout sélectionner"
		/>
	);
}
