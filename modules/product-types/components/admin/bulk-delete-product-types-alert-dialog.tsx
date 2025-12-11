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
import { useBulkDeleteProductTypes } from "@/modules/product-types/hooks/use-bulk-delete-product-types";

export const BULK_DELETE_PRODUCT_TYPES_DIALOG_ID = "bulk-delete-product-types";

type BulkDeleteProductTypesDialogData = {
	productTypeIds: string[];
	[key: string]: unknown;
};

export function BulkDeleteProductTypesAlertDialog() {
	const { isOpen, data, close } = useAlertDialog<BulkDeleteProductTypesDialogData>(
		BULK_DELETE_PRODUCT_TYPES_DIALOG_ID
	);

	const { action, isPending } = useBulkDeleteProductTypes({
		onSuccess: () => {
			close();
		},
	});

	if (!data) return null;

	const count = data.productTypeIds.length;

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="ids" value={JSON.stringify(data.productTypeIds)} />
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer les types de bijoux</AlertDialogTitle>
						<AlertDialogDescription>
							Supprimer{" "}
							<span className="font-semibold">
								{count} type{count > 1 ? "s" : ""} de bijou{count > 1 ? "x" : ""}
							</span>{" "}
							?
							<br />
							<br />
							<span className="text-amber-600">
								Les types système et ceux avec des produits actifs seront ignorés.
							</span>
							<br />
							<br />
							Cette action est irréversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button
							type="submit"
							disabled={isPending}
						>
							{isPending ? "Suppression..." : "Supprimer"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
