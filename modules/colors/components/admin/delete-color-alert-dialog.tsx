"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

interface DeleteColorData {
	colorId: string;
	colorName: string;
	[key: string]: unknown;
}

export function DeleteColorAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteColorData>(DELETE_COLOR_DIALOG_ID);
	const backToList = useBackToListOnDelete("/admin/catalogue/couleurs");
	const { action, isPending } = useDeleteColor({
		onSuccess: () => {
			deleteDialog.close();
			backToList();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteColorData>
			dialogId={DELETE_COLOR_DIALOG_ID}
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "id", dataKey: "colorId" }]}
			description={(data) => (
				<div className="space-y-3">
					<p>
						Êtes-vous sûr de vouloir supprimer la couleur{" "}
						<strong>&quot;{data?.colorName}&quot;</strong> ?
					</p>
					<p className="text-destructive font-medium">Cette action est irréversible.</p>
				</div>
			)}
		/>
	);
}
