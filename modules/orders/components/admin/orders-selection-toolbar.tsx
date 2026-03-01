"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { OrderSelectionActions } from "./order-selection-actions";

export function OrdersSelectionToolbar() {
	const { selectedItems } = useSelectionContext();

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-muted-foreground text-sm">
				{selectedItems.length} commande{selectedItems.length > 1 ? "s" : ""} sélectionnée
				{selectedItems.length > 1 ? "s" : ""}
			</span>
			<OrderSelectionActions />
		</SelectionToolbar>
	);
}
