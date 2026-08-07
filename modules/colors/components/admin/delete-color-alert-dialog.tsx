"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	TaxonomyDeleteAlertDialog,
	useTaxonomyDeleteDialog,
} from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const DELETE_COLOR_DIALOG_ID = TAXONOMY_CONFIG.color.deleteDialogId;

export function DeleteColorAlertDialog() {
	const onDeleted = useTaxonomyDeleteDialog(TAXONOMY_CONFIG.color);
	const { action } = useDeleteColor({ onSuccess: onDeleted });

	return <TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.color} action={action} />;
}
