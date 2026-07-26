"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	TaxonomyDeleteAlertDialog,
	useTaxonomyDeleteDialog,
} from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";
import { useDeleteMaterial } from "@/modules/materials/hooks/use-delete-material";

export const DELETE_MATERIAL_DIALOG_ID = "delete-material";

export function DeleteMaterialAlertDialog() {
	const onDeleted = useTaxonomyDeleteDialog(TAXONOMY_CONFIG.material);
	const { action, isPending } = useDeleteMaterial({ onSuccess: onDeleted });

	return (
		<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.material} action={action} isPending={isPending} />
	);
}
