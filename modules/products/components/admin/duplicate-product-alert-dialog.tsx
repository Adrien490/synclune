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
import { useDuplicateProduct } from "@/modules/products/hooks/use-duplicate-product";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DUPLICATE_PRODUCT_DIALOG_ID = "duplicate-product";

interface DuplicateProductData {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DuplicateProductAlertDialog() {
	const duplicateDialog = useAlertDialog<DuplicateProductData>(
		DUPLICATE_PRODUCT_DIALOG_ID
	);

	const { action, isPending } = useDuplicateProduct({
		onSuccess: () => {
			duplicateDialog.close();
			// Rediriger vers la page de modification du bijou dupliqué
			// Le slug est retourné dans le data de la response
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			duplicateDialog.close();
		}
	};

	return (
		<AlertDialog open={duplicateDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="productId"
						value={duplicateDialog.data?.productId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Dupliquer ce bijou</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Es-tu sûr de vouloir dupliquer le bijou{" "}
									<strong>&quot;{duplicateDialog.data?.productTitle}&quot;</strong> ?
								</p>
								<p className="mt-4">Une copie sera créée avec :</p>
								<ul className="list-disc list-inside mt-2 space-y-1">
									<li>Le titre préfixé par &quot;Copie de&quot;</li>
									<li>Toutes les variantes et leurs images</li>
									<li>Le statut mis en &quot;Brouillon&quot;</li>
								</ul>
								<p className="text-muted-foreground text-xs mt-4">
									Tu pourras ensuite modifier le bijou dupliqué selon tes besoins.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Duplication..." : "Dupliquer"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
