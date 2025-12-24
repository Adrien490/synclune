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
import { useDeleteProductType } from "@/modules/product-types/hooks/use-delete-product-type";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_PRODUCT_TYPE_DIALOG_ID = "delete-product-type";

interface DeleteProductTypeData {
	productTypeId: string;
	label: string;
	productsCount?: number;
	[key: string]: unknown;
}

export function DeleteProductTypeAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductTypeData>(
		DELETE_PRODUCT_TYPE_DIALOG_ID
	);

	const { action, isPending } = useDeleteProductType({
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
						name="productTypeId"
						value={deleteDialog.data?.productTypeId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce type de bijou ?</AlertDialogTitle>
						<AlertDialogDescription>
							Veux-tu vraiment supprimer le type{" "}
							<strong>&quot;{deleteDialog.data?.label}&quot;</strong> ?
							<br />
							<br />
							{deleteDialog.data?.productsCount && deleteDialog.data.productsCount > 0 && (
								<>
									<span className="text-orange-600 dark:text-orange-400 font-medium">
										Attention : {deleteDialog.data.productsCount} bijou(x) utilise(nt) ce type.
										Ils seront dissociés de ce type.
									</span>
									<br />
									<br />
								</>
							)}
							<span className="text-muted-foreground text-sm">
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
