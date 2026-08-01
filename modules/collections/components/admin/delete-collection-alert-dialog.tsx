"use client";

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
import { useDeleteCollection } from "@/modules/collections/hooks/use-delete-collection";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";
import { Spinner } from "@/shared/components/ui/spinner";

export const DELETE_COLLECTION_DIALOG_ID = "delete-collection";

interface DeleteCollectionData {
	collectionId: string;
	collectionName: string;
	productsCount: number;
	[key: string]: unknown;
}

export function DeleteCollectionAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteCollectionData>(DELETE_COLLECTION_DIALOG_ID);
	const backToList = useBackToListOnDelete("/admin/catalogue/collections");

	const { action, isPending } = useDeleteCollection({
		onSuccess: () => {
			deleteDialog.close();
			backToList();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	const productsCount = deleteDialog.data?.productsCount ?? 0;

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.collectionId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer la collection{" "}
									<strong>&quot;{deleteDialog.data?.collectionName}&quot;</strong> ?
								</p>
								{productsCount > 0 ? (
									<>
										<p className="text-warning font-medium">
											Cette collection contient {productsCount} produit
											{productsCount > 1 ? "s" : ""}.
										</p>
										<p>
											Les produits seront préservés mais n&apos;appartiendront plus à aucune
											collection.
										</p>
									</>
								) : null}
								<p className="text-destructive font-medium">Cette action est irréversible.</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
