"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { ProductSelectionActions } from "./product-selection-actions";

interface ProductsSelectionToolbarProps {
	products: Array<{
		id: string;
		status: "DRAFT" | "PUBLIC" | "ARCHIVED";
		title?: string;
	}>;
	pageItemIds?: string[];
}

export function ProductsSelectionToolbar({ products, pageItemIds }: ProductsSelectionToolbarProps) {
	return (
		<SelectionToolbar pageItemIds={pageItemIds}>
			<ProductSelectionActions products={products} />
		</SelectionToolbar>
	);
}
