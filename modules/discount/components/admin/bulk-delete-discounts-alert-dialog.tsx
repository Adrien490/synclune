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
import { useBulkDeleteDiscounts } from "@/modules/discount/hooks/admin/use-bulk-delete-discounts";
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
					<input
						type="hidden"
						name="ids"
						value={JSON.stringify(dialog.data?.discountIds ?? [])}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer{" "}
							<strong>
								{count} code{count > 1 ? "s" : ""} promo
							</strong>{" "}
							?
							<br />
							<br />
							{totalUsageCount > 0 && (
								<>
									<span className="text-amber-600 dark:text-amber-500 font-medium">
										{totalUsageCount} utilisation{totalUsageCount > 1 ? "s" : ""}{" "}
										au total. Les codes déjà utilisés seront ignorés.
									</span>
									<br />
									<br />
								</>
							)}
							<span className="text-destructive font-medium">
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
