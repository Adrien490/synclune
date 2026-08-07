"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";

export const ARCHIVE_COLLECTION_DIALOG_ID = "archive-collection";

interface ArchiveCollectionData {
	collectionId: string;
	collectionName: string;
	collectionStatus: CollectionStatus;
	[key: string]: unknown;
}

export function ArchiveCollectionAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveCollectionData>(ARCHIVE_COLLECTION_DIALOG_ID);
	const { action } = useUpdateCollectionStatus();

	const isArchiving = archiveDialog.data?.collectionStatus !== CollectionStatus.ARCHIVED;
	const targetStatus: CollectionStatus = isArchiving
		? CollectionStatus.ARCHIVED
		: CollectionStatus.PUBLIC;

	return (
		<ConfirmDialog
			open={archiveDialog.isOpen}
			onClose={archiveDialog.close}
			action={action}
			tone={isArchiving ? "warning" : "success"}
			fields={{ id: archiveDialog.data?.collectionId, status: targetStatus }}
			title={isArchiving ? "Archiver la collection" : "Restaurer la collection"}
			confirmLabel={isArchiving ? "Archiver" : "Restaurer"}
			descriptionClassName="space-y-3"
			description={
				isArchiving ? (
					<>
						<p>
							Êtes-vous sûr de vouloir archiver la collection{" "}
							<strong>&quot;{archiveDialog.data?.collectionName}&quot;</strong> ?
						</p>
						<p>
							La collection ne sera plus visible sur la boutique mais restera accessible dans le
							dashboard.
						</p>
						<p className="text-muted-foreground text-xs">
							Vous pourrez la restaurer a tout moment.
						</p>
					</>
				) : (
					<>
						<p>
							Êtes-vous sûr de vouloir restaurer la collection{" "}
							<strong>&quot;{archiveDialog.data?.collectionName}&quot;</strong> ?
						</p>
						<p>
							La collection sera remise en statut &quot;Public&quot; et redeviendra visible sur la
							boutique.
						</p>
					</>
				)
			}
		/>
	);
}
