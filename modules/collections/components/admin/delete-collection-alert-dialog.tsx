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
import { useDeleteCollection } from "@/modules/collections/hooks/use-delete-collection";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_COLLECTION_DIALOG_ID = "delete-collection";

interface DeleteCollectionData {
	collectionId: string;
	collectionName: string;
	productsCount: number;
	[key: string]: unknown;
}

export function DeleteCollectionAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteCollectionData>(
		DELETE_COLLECTION_DIALOG_ID
	);

	const { action, isPending } = useDeleteCollection({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	const productsCount = deleteDialog.data?.productsCount || 0;

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={deleteDialog.data?.collectionId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr de vouloir supprimer la collection{" "}
							<strong>&quot;{deleteDialog.data?.collectionName}&quot;</strong> ?
							<br />
							<br />
							{productsCount > 0 ? (
								<>
									<span className="text-amber-600 dark:text-amber-500 font-medium">
										Cette collection contient {productsCount} produit
										{productsCount > 1 ? "s" : ""}.
									</span>
									<br />
									Les produits seront préservés mais n&apos;appartiendront plus à
									aucune collection.
									<br />
									<br />
								</>
							) : null}
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
