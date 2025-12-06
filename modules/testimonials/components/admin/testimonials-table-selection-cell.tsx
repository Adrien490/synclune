"use client"

import { ItemCheckbox } from "@/shared/components/item-checkbox"
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox"

interface TestimonialsTableSelectionCellProps {
	type: "header" | "row"
	testimonialIds?: string[]
	testimonialId?: string
}

export function TestimonialsTableSelectionCell({
	type,
	testimonialIds,
	testimonialId,
}: TestimonialsTableSelectionCellProps) {
	if (type === "header" && testimonialIds) {
		return <SelectAllCheckbox itemIds={testimonialIds} />
	}

	if (type === "row" && testimonialId) {
		return <ItemCheckbox itemId={testimonialId} />
	}

	return null
}
