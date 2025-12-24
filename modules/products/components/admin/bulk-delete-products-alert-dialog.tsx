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
import { useBulkDeleteProducts } from "@/modules/products/hooks/use-bulk-delete-products";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const BULK_DELETE_PRODUCTS_DIALOG_ID = "bulk-delete-products";

interface BulkDeleteProductsData {
	productIds: string[];
	[key: string]: unknown;
}

export function BulkDeleteProductsAlertDialog() {
	const dialog = useAlertDialog<BulkDeleteProductsData>(
		BULK_DELETE_PRODUCTS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkDeleteProducts({
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

	const count = dialog.data?.productIds?.length || 0;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="productIds"
						value={JSON.stringify(dialog.data?.productIds ?? [])}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr de vouloir supprimer{" "}
							<strong>
								{count} produit{count > 1 ? "s" : ""}
							</strong>{" "}
							?
							<br />
							<br />
							<span className="text-destructive font-medium">
								Cette action est irréversible
							</span>{" "}
							et supprimera également toutes les variantes et images associées.
							<br />
							<br />
							<span className="text-muted-foreground text-xs">
								Note: Les commandes existantes conserveront les informations des
								produits via des snapshots.
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
