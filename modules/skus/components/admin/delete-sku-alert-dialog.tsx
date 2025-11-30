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
import { useDeleteProductSku } from "@/modules/skus/hooks/use-delete-sku";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";

export const DELETE_PRODUCT_SKU_DIALOG_ID = "delete-product-sku";

interface DeleteProductSkuData {
	skuId: string;
	skuName: string;
	isDefault?: boolean;
	[key: string]: unknown;
}

export function DeleteProductSkuAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductSkuData>(
		DELETE_PRODUCT_SKU_DIALOG_ID
	);

	const { action, isPending } = useDeleteProductSku({
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
					<input
						type="hidden"
						name="skuId"
						value={deleteDialog.data?.skuId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteDialog.data?.isDefault ? (
								<>
									<strong className="text-destructive">
										Attention : Cette variante est la variante principale du
										produit.
									</strong>
									<br />
									<br />
									Es-tu sûr de vouloir supprimer la variante{" "}
									<strong>{deleteDialog.data?.skuName}</strong> ?<br />
									<br />
									Tu devras définir une nouvelle variante principale après cette
									suppression.
								</>
							) : (
								<>
									Es-tu sûr de vouloir supprimer la variante{" "}
									<strong>{deleteDialog.data?.skuName}</strong> ?
									<br />
									<br />
									Cette action est irréversible et supprimera également toutes
									les images associées à cette variante.
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
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								"Supprimer"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
