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
import { useDeleteDiscount } from "@/modules/discounts/hooks/use-delete-discount";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";

export const DELETE_DISCOUNT_DIALOG_ID = "delete-discount";

interface DeleteDiscountData {
	discountId: string;
	discountCode: string;
	usageCount: number;
	[key: string]: unknown;
}

export function DeleteDiscountAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteDiscountData>(
		DELETE_DISCOUNT_DIALOG_ID
	);

	const { action, isPending } = useDeleteDiscount({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	const usageCount = deleteDialog.data?.usageCount || 0;

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={deleteDialog.data?.discountId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer le code promo{" "}
									<strong>&quot;{deleteDialog.data?.discountCode}&quot;</strong> ?
								</p>
								{usageCount > 0 ? (
									<>
										<p className="text-amber-600 dark:text-amber-500 font-medium">
											Ce code a été utilisé {usageCount} fois et ne peut pas être
											supprimé.
										</p>
										<p>
											Vous pouvez le désactiver à la place pour empêcher son
											utilisation.
										</p>
									</>
								) : (
									<p className="text-destructive font-medium">
										Cette action est irréversible.
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending || usageCount > 0}
							aria-busy={isPending}
						>
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
