"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { ProductVariantSelectionActions } from "./sku-selection-actions";

interface ProductVariantsSelectionToolbarProps {
	pageItemIds?: string[];
}

export function ProductVariantsSelectionToolbar({
	pageItemIds,
}: ProductVariantsSelectionToolbarProps = {}) {
	return (
		<SelectionToolbar pageItemIds={pageItemIds}>
			<ProductVariantSelectionActions />
		</SelectionToolbar>
	);
}
