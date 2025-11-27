"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { ProductVariantSelectionActions } from "./product-variant-selection-actions";

export function ProductVariantsSelectionToolbar() {
	return (
		<SelectionToolbar>
			<ProductVariantSelectionActions />
		</SelectionToolbar>
	);
}
