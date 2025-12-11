"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteProduct } from "@/modules/products/hooks/use-delete-product";

export const DELETE_PRODUCT_DIALOG_ID = "delete-product";

interface DeleteProductData {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DeleteProductAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductData>(
		DELETE_PRODUCT_DIALOG_ID
	);

	const { action, isPending } = useDeleteProduct({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.productId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr de vouloir supprimer le bijou{" "}
							<strong>&quot;{deleteDialog.data?.productTitle}&quot;</strong> ?
							<br />
							<br />
							<span className="text-destructive font-medium">
								Cette action est irréversible
							</span>{" "}
							et supprimera également toutes les variantes et images associées.
							<br />
							<br />
							<span className="text-muted-foreground text-xs">
								Note: Les commandes existantes conserveront les informations du
								bijou via des snapshots.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Suppression..." : "Supprimer"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
