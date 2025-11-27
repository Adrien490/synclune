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
import { useBulkArchiveCollections } from "@/modules/collections/hooks/admin/use-bulk-archive-collections";
import { useSelectionContext } from "@/shared/contexts/selection-context";

export const BULK_ARCHIVE_COLLECTIONS_DIALOG_ID = "bulk-archive-collections";

interface BulkArchiveCollectionsData {
	collectionIds: string[];
	targetStatus: CollectionStatus;
	[key: string]: unknown;
}

export function BulkArchiveCollectionsAlertDialog() {
	const dialog = useAlertDialog<BulkArchiveCollectionsData>(
		BULK_ARCHIVE_COLLECTIONS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkArchiveCollections({
		onSuccess: () => {
			clearSelection();
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const isArchiving = dialog.data?.targetStatus === CollectionStatus.ARCHIVED;
	const count = dialog.data?.collectionIds?.length || 0;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="collectionIds"
						value={JSON.stringify(dialog.data?.collectionIds ?? [])}
					/>
					<input
						type="hidden"
						name="targetStatus"
						value={dialog.data?.targetStatus ?? CollectionStatus.ARCHIVED}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isArchiving
								? `Archiver ${count} collection${count > 1 ? "s" : ""}`
								: `Restaurer ${count} collection${count > 1 ? "s" : ""}`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isArchiving ? (
								<>
									Es-tu sur de vouloir archiver{" "}
									<strong>{count} collection{count > 1 ? "s" : ""}</strong> ?
									<br />
									<br />
									{count > 1 ? "Ces collections ne seront" : "Cette collection ne sera"}{" "}
									plus {count > 1 ? "visibles" : "visible"} sur la boutique mais{" "}
									{count > 1 ? "resteront accessibles" : "restera accessible"}{" "}
									dans le dashboard.
									<br />
									<br />
									<span className="text-muted-foreground text-xs">
										Tu pourras les restaurer a tout moment.
									</span>
								</>
							) : (
								<>
									Es-tu sur de vouloir restaurer{" "}
									<strong>{count} collection{count > 1 ? "s" : ""}</strong> ?
									<br />
									<br />
									{count > 1 ? "Ces collections seront remises" : "Cette collection sera remise"}{" "}
									en statut &quot;Public&quot; et{" "}
									{count > 1 ? "redeviendront visibles" : "redeviendra visible"}{" "}
									sur la boutique.
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
