"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface StripePaymentsTableSelectionCellProps {
	type: "header" | "row";
	paymentIds?: string[];
	paymentId?: string;
}

export function StripePaymentsTableSelectionCell({
	type,
	paymentIds,
	paymentId,
}: StripePaymentsTableSelectionCellProps) {
	if (type === "header" && paymentIds) {
		return <SelectAllCheckbox itemIds={paymentIds} />;
	}

	if (type === "row" && paymentId) {
		return <ItemCheckbox itemId={paymentId} />;
	}

	return null;
}
