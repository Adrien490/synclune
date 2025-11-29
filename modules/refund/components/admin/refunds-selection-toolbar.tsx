"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { RefundSelectionActions } from "./refund-selection-actions";

interface RefundsSelectionToolbarProps {
	refundIds: string[];
}

export function RefundsSelectionToolbar({}: RefundsSelectionToolbarProps) {
	const { selectedItems } = useSelectionContext();

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} remboursement{selectedItems.length > 1 ? "s" : ""}{" "}
				sélectionné
				{selectedItems.length > 1 ? "s" : ""}
			</span>
			<RefundSelectionActions />
		</SelectionToolbar>
	);
}
