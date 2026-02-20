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
import { useBulkDeleteDiscounts } from "@/modules/discounts/hooks/use-bulk-delete-discounts";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";

export const BULK_DELETE_DISCOUNTS_DIALOG_ID = "bulk-delete-discounts";

interface BulkDeleteDiscountsData {
	discountIds: string[];
	totalUsageCount?: number;
	[key: string]: unknown;
}

export function BulkDeleteDiscountsAlertDialog() {
	const dialog = useAlertDialog<BulkDeleteDiscountsData>(
		BULK_DELETE_DISCOUNTS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkDeleteDiscounts({
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

	const count = dialog.data?.discountIds?.length || 0;
	const totalUsageCount = dialog.data?.totalUsageCount || 0;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					{(dialog.data?.discountIds ?? []).map((id) => (
						<input key={id} type="hidden" name="ids" value={id} />
					))}

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer{" "}
									<strong>
										{count} code{count > 1 ? "s" : ""} promo
									</strong>{" "}
									?
								</p>
								{totalUsageCount > 0 && (
									<p className="text-amber-600 dark:text-amber-500 font-medium">
										{totalUsageCount} utilisation{totalUsageCount > 1 ? "s" : ""}{" "}
										au total. Les codes déjà utilisés seront ignorés.
									</p>
								)}
								<p className="text-destructive font-medium">
									Cette action est irréversible.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
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
