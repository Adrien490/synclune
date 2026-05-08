"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";
import { LoaderCircle } from "lucide-react";

export const ARCHIVE_COLLECTION_DIALOG_ID = "archive-collection";

interface ArchiveCollectionData {
	collectionId: string;
	collectionName: string;
	collectionStatus: CollectionStatus;
	[key: string]: unknown;
}

export function ArchiveCollectionAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveCollectionData>(ARCHIVE_COLLECTION_DIALOG_ID);

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
		<ResponsiveAlertDialog open={archiveDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={archiveDialog.data?.collectionId ?? ""} />
					<input type="hidden" name="status" value={targetStatus} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isArchiving ? "Archiver la collection" : "Restaurer la collection"}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-3">
								{isArchiving ? (
									<>
										<p>
											Êtes-vous sûr de vouloir archiver la collection{" "}
											<strong>&quot;{archiveDialog.data?.collectionName}&quot;</strong> ?
										</p>
										<p>
											La collection ne sera plus visible sur la boutique mais restera accessible
											dans le dashboard.
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
											La collection sera remise en statut &quot;Public&quot; et redeviendra visible
											sur la boutique.
										</p>
									</>
								)}
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							className={isArchiving ? "bg-orange-600 text-white hover:bg-orange-700" : undefined}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending
								? isArchiving
									? "Archivage…"
									: "Restauration…"
								: isArchiving
									? "Archiver"
									: "Restaurer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
