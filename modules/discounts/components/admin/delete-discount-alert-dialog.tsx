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
import { useDeleteDiscount } from "@/modules/discounts/hooks/use-delete-discount";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { LoaderCircle } from "lucide-react";

export const DELETE_DISCOUNT_DIALOG_ID = "delete-discount";

interface DeleteDiscountData {
	discountId: string;
	discountCode: string;
	usageCount: number;
	[key: string]: unknown;
}

export function DeleteDiscountAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteDiscountData>(DELETE_DISCOUNT_DIALOG_ID);
	const haptic = useHaptic();

	const { action, isPending } = useDeleteDiscount({
		onSuccess: () => {
			haptic("success");
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	const usageCount = deleteDialog.data?.usageCount ?? 0;

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.discountId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer le code promo{" "}
									<strong>&quot;{deleteDialog.data?.discountCode}&quot;</strong> ?
								</p>
								{usageCount > 0 ? (
									<>
										<p className="font-medium text-amber-600">
											Ce code a été utilisé {usageCount} fois et ne peut pas être supprimé.
										</p>
										<p>Vous pouvez le désactiver à la place pour empêcher son utilisation.</p>
									</>
								) : (
									<p className="text-destructive font-medium">Cette action est irréversible.</p>
								)}
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending || usageCount > 0}
							aria-busy={isPending}
							onClick={() => haptic("heavy")}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
