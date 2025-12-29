"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

interface DeleteColorData {
	colorId: string;
	colorName: string;
	[key: string]: unknown;
}

export function DeleteColorAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteColorData>(DELETE_COLOR_DIALOG_ID);
	const { action, isPending } = useDeleteColor({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteColorData>
			dialogId={DELETE_COLOR_DIALOG_ID}
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "id", dataKey: "colorId" }]}
			description={(data) => (
				<>
					Es-tu sûr(e) de vouloir supprimer la couleur{" "}
					<strong>&quot;{data?.colorName}&quot;</strong> ?
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
