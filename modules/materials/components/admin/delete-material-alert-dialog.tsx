"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	TaxonomyDeleteAlertDialog,
	useTaxonomyDeleteDialog,
} from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";
import { useDeleteMaterial } from "@/modules/materials/hooks/use-delete-material";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const DELETE_MATERIAL_DIALOG_ID = TAXONOMY_CONFIG.material.deleteDialogId;

export function DeleteMaterialAlertDialog() {
	const onDeleted = useTaxonomyDeleteDialog(TAXONOMY_CONFIG.material);
	const { action } = useDeleteMaterial({ onSuccess: onDeleted });

	return <TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.material} action={action} />;
}
