"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	TaxonomyDeleteAlertDialog,
	useTaxonomyDeleteDialog,
} from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";
import { useDeleteProductType } from "@/modules/product-types/hooks/use-delete-product-type";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const DELETE_PRODUCT_TYPE_DIALOG_ID = TAXONOMY_CONFIG["product-type"].deleteDialogId;

export function DeleteProductTypeAlertDialog() {
	const onDeleted = useTaxonomyDeleteDialog(TAXONOMY_CONFIG["product-type"]);
	const { action } = useDeleteProductType({ onSuccess: onDeleted });

	return <TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG["product-type"]} action={action} />;
}
