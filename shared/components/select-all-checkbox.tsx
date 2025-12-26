"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Checkbox } from "./ui/checkbox";

interface SelectAllCheckboxProps {
	itemIds: string[];
}

export function SelectAllCheckbox({ itemIds }: SelectAllCheckboxProps) {
	const { areAllSelected, areSomeSelected, handleSelectionChange } =
		useSelectionContext();
	const allSelected = areAllSelected(itemIds);
	const someSelected = areSomeSelected(itemIds);

	const checkedState = allSelected
		? true
		: someSelected
			? "indeterminate"
			: false;

	return (
		<Checkbox
			checked={checkedState}
			onCheckedChange={(checked) => {
				handleSelectionChange(itemIds, checked === true);
			}}
			aria-label="Tout sélectionner"
		/>
	);
}
