"use client";

import { BulkDeleteDialog } from "@/shared/components/dialogs";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteProducts } from "@/modules/products/hooks/use-bulk-delete-products";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const BULK_DELETE_PRODUCTS_DIALOG_ID = "bulk-delete-products";

type BulkDeleteProductsData = {
	productIds: string[];
	productTitles?: string[];
	[key: string]: unknown;
};

export function BulkDeleteProductsAlertDialog() {
	const dialog = useAlertDialog<BulkDeleteProductsData>(BULK_DELETE_PRODUCTS_DIALOG_ID);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkDeleteProducts({
		onSuccess: () => {
			clearSelection();
			dialog.close();
		},
	});

	const productTitles = dialog.data?.productTitles ?? [];

	return (
		<BulkDeleteDialog
			dialogId={BULK_DELETE_PRODUCTS_DIALOG_ID}
			action={action}
			isPending={isPending}
			idsFieldName="productIds"
			idsDataKey="productIds"
			description={(count) => (
				<div className="space-y-3">
					<p>
						Êtes-vous sûr de vouloir supprimer{" "}
						<strong>
							{count} produit{count > 1 ? "s" : ""}
						</strong>{" "}
						?
					</p>
					<p>
						<span className="text-destructive font-medium">Cette action est irréversible</span> et
						supprimera également toutes les variantes et images associées.
					</p>
					<p className="text-muted-foreground text-xs">
						Note: Les commandes existantes conserveront les informations des produits via des
						snapshots.
					</p>
				</div>
			)}
			previewItems={
				productTitles.length > 0 ? (
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Produits concernés
						</p>
						<ul className="border-border/60 bg-muted/30 divide-y rounded-md border text-sm">
							{productTitles.map((title, index) => (
								<li key={`${index}-${title}`} className="truncate px-3 py-2" title={title}>
									{title}
								</li>
							))}
						</ul>
					</div>
				) : null
			}
		/>
	);
}
