"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useDeleteMaterial } from "@/modules/materials/hooks/use-delete-material";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_MATERIAL_DIALOG_ID = "delete-material";

interface DeleteMaterialData {
	materialId: string;
	materialName: string;
	[key: string]: unknown;
}

export function DeleteMaterialAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteMaterialData>(DELETE_MATERIAL_DIALOG_ID);
	const { action, isPending } = useDeleteMaterial({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteMaterialData>
			dialogId={DELETE_MATERIAL_DIALOG_ID}
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "id", dataKey: "materialId" }]}
			description={(data) => (
				<>
					Êtes-vous sûr de vouloir supprimer le matériau{" "}
					<strong>&quot;{data?.materialName}&quot;</strong> ?
					<br />
					<br />
					<span className="text-destructive font-medium">
						Cette action est irréversible.
					</span>
				</>
			)}
		/>
	);
}
