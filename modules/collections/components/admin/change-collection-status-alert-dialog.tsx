"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";

export const CHANGE_COLLECTION_STATUS_DIALOG_ID = "change-collection-status";

interface ChangeCollectionStatusData {
	collectionId: string;
	collectionName: string;
	targetActive: boolean;
	[key: string]: unknown;
}

/**
 * Schéma lean (lot 2) : le statut d'une collection est un booléen `active`
 * (publiée / brouillon) — plus d'état « archivée ».
 */
export function ChangeCollectionStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeCollectionStatusData>(CHANGE_COLLECTION_STATUS_DIALOG_ID);
	const { action } = useUpdateCollectionStatus();

	const targetActive = dialog.data?.targetActive ?? true;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone={targetActive ? "success" : "neutral"}
			fields={{ id: dialog.data?.collectionId, active: String(targetActive) }}
			title={targetActive ? "Publier la collection ?" : "Repasser en brouillon ?"}
			confirmLabel={targetActive ? "Publier" : "Mettre en brouillon"}
			descriptionClassName="space-y-4"
			description={
				<>
					<div>
						Tu es sur le point de {targetActive ? "publier" : "dépublier"}{" "}
						<strong>&quot;{dialog.data?.collectionName}&quot;</strong>.
					</div>

					<div className="bg-muted rounded-md p-3">
						<div className="text-sm">
							{targetActive
								? "La collection sera visible par tous les visiteurs de la boutique."
								: "La collection ne sera plus visible sur la boutique mais restera accessible dans le dashboard."}
						</div>
					</div>
				</>
			}
		/>
	);
}
