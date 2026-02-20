"use client";

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
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteCollections } from "@/modules/collections/hooks/use-bulk-delete-collections";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";

export const BULK_DELETE_COLLECTIONS_DIALOG_ID = "bulk-delete-collections";

interface BulkDeleteCollectionsData {
	collectionIds: string[];
	totalProductsCount?: number;
	[key: string]: unknown;
}

export function BulkDeleteCollectionsAlertDialog() {
	const dialog = useAlertDialog<BulkDeleteCollectionsData>(
		BULK_DELETE_COLLECTIONS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkDeleteCollections({
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

	const count = dialog.data?.collectionIds?.length || 0;
	const totalProductsCount = dialog.data?.totalProductsCount || 0;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="ids"
						value={JSON.stringify(dialog.data?.collectionIds ?? [])}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer{" "}
							<strong>
								{count} collection{count > 1 ? "s" : ""}
							</strong>{" "}
							?
							<br />
							<br />
							{totalProductsCount > 0 && (
								<>
									<span className="text-amber-600 dark:text-amber-500 font-medium">
										Ces collections contiennent au total {totalProductsCount}{" "}
										produit{totalProductsCount > 1 ? "s" : ""}.
									</span>
									<br />
									Les produits seront préservés mais n&apos;appartiendront plus à
									aucune collection.
									<br />
									<br />
								</>
							)}
							<span className="text-destructive font-medium">
								Cette action est irréversible.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
						>
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
