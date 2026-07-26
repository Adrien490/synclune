"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	TaxonomyDeleteAlertDialog,
	useTaxonomyDeleteDialog,
} from "@/modules/taxonomies/components/taxonomy-delete-alert-dialog";
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

export function DeleteColorAlertDialog() {
	const onDeleted = useTaxonomyDeleteDialog(TAXONOMY_CONFIG.color);
	const { action, isPending } = useDeleteColor({ onSuccess: onDeleted });

	return (
		<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.color} action={action} isPending={isPending} />
	);
}
