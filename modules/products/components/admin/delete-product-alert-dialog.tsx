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
import { DeleteProductWrapper } from "@/modules/products/components/admin/delete-product-wrapper";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

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

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
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
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<DeleteProductWrapper productId={deleteDialog.data?.productId ?? ""}>
						<Button
							variant="destructive"
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</Button>
					</DeleteProductWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
