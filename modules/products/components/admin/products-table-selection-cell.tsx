"use client";

import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";

interface ProductsTableSelectionCellProps {
	type: "header" | "row";
	productIds?: string[];
	productId?: string;
	/** Titre du produit pour l'accessibilité */
	productTitle?: string;
}

export function ProductsTableSelectionCell({
	type,
	productIds,
	productId,
	productTitle,
}: ProductsTableSelectionCellProps) {
	if (type === "header" && productIds) {
		return <SelectAllCheckbox itemIds={productIds} />;
	}

	if (type === "row" && productId) {
		return (
			<ItemCheckbox
				itemId={productId}
				ariaLabel={productTitle ? `Sélectionner ${productTitle}` : undefined}
			/>
		);
	}

	return null;
}
