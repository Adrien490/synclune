"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { ProductSelectionActions } from "./product-selection-actions";

interface ProductsSelectionToolbarProps {
	products: Array<{
		id: string;
		status: "DRAFT" | "PUBLIC" | "ARCHIVED";
	}>;
}

export function ProductsSelectionToolbar({ products }: ProductsSelectionToolbarProps) {
	return (
		<SelectionToolbar>
			<ProductSelectionActions products={products} />
		</SelectionToolbar>
	);
}
