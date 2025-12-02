"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";

export const ARCHIVE_COLLECTION_DIALOG_ID = "archive-collection";

interface ArchiveCollectionData {
	collectionId: string;
	collectionName: string;
	collectionStatus: CollectionStatus;
	[key: string]: unknown;
}

export function ArchiveCollectionAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveCollectionData>(
		ARCHIVE_COLLECTION_DIALOG_ID
	);

	const { action, isPending } = useUpdateCollectionStatus({
		onSuccess: () => {
			archiveDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			archiveDialog.close();
		}
	};

	const isArchiving = archiveDialog.data?.collectionStatus !== CollectionStatus.ARCHIVED;
	const targetStatus: CollectionStatus = isArchiving
		? CollectionStatus.ARCHIVED
		: CollectionStatus.PUBLIC;

	return (
		<AlertDialog open={archiveDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={archiveDialog.data?.collectionId ?? ""}
					/>
					<input type="hidden" name="status" value={targetStatus} />

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isArchiving ? "Archiver la collection" : "Restaurer la collection"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isArchiving ? (
								<>
									Es-tu sur de vouloir archiver la collection{" "}
									<strong>
										&quot;{archiveDialog.data?.collectionName}&quot;
									</strong>{" "}
									?
									<br />
									<br />
									La collection ne sera plus visible sur la boutique mais restera
									accessible dans le dashboard.
									<br />
									<br />
									<span className="text-muted-foreground text-xs">
										Tu pourras la restaurer a tout moment.
									</span>
								</>
							) : (
								<>
									Es-tu sur de vouloir restaurer la collection{" "}
									<strong>
										&quot;{archiveDialog.data?.collectionName}&quot;
									</strong>{" "}
									?
									<br />
									<br />
									La collection sera remise en statut &quot;Public&quot; et
									redeviendra visible sur la boutique.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							onClick={(e) => e.preventDefault()}
							className={
								isArchiving
									? "bg-orange-600 text-white hover:bg-orange-700"
									: undefined
							}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{isArchiving ? "Archivage..." : "Restauration..."}
								</>
							) : (
								isArchiving ? "Archiver" : "Restaurer"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
