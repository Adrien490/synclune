"use client";

import { TaxonomyActiveToggle } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useToggleProductTypeStatus } from "@/modules/product-types/hooks/use-toggle-product-type-status";

interface ProductTypeActiveToggleProps {
	productTypeId: string;
	isActive: boolean;
	/** Un type système ne peut pas être désactivé. */
	isSystem?: boolean;
}

export function ProductTypeActiveToggle({ productTypeId, isActive, isSystem = false }: ProductTypeActiveToggleProps) {
	const { toggleStatus, isPending } = useToggleProductTypeStatus();

	return (
		<TaxonomyActiveToggle
			id={productTypeId}
			isActive={isActive}
			toggleStatus={toggleStatus}
			isPending={isPending}
			disabled={isSystem}
		/>
	);
}
