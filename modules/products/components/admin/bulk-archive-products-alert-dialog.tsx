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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";
import { useBulkArchiveProducts } from "@/modules/products/hooks/admin/use-bulk-archive-products";
import { useSelectionContext } from "@/shared/contexts/selection-context";

export const BULK_ARCHIVE_PRODUCTS_DIALOG_ID = "bulk-archive-products";

interface BulkArchiveProductsData {
	productIds: string[];
	targetStatus: "ARCHIVED" | "PUBLIC";
	[key: string]: unknown;
}

export function BulkArchiveProductsAlertDialog() {
	const dialog = useAlertDialog<BulkArchiveProductsData>(
		BULK_ARCHIVE_PRODUCTS_DIALOG_ID
	);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkArchiveProducts({
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

	const isArchiving = dialog.data?.targetStatus === "ARCHIVED";
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
					<input
						type="hidden"
						name="targetStatus"
						value={dialog.data?.targetStatus ?? "ARCHIVED"}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isArchiving
								? `Archiver ${count} bijou${count > 1 ? "x" : ""}`
								: `Restaurer ${count} bijou${count > 1 ? "x" : ""}`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isArchiving ? (
								<>
									Es-tu sûr de vouloir archiver{" "}
									<strong>{count} bijou{count > 1 ? "x" : ""}</strong> ?
									<br />
									<br />
									{count > 1 ? "Ces bijoux ne seront" : "Ce bijou ne sera"}{" "}
									plus {count > 1 ? "visibles" : "visible"} sur la boutique mais{" "}
									{count > 1 ? "resteront accessibles" : "restera accessible"}{" "}
									dans le dashboard.
									<br />
									<br />
									<span className="text-muted-foreground text-xs">
										Tu pourras les restaurer à tout moment.
									</span>
								</>
							) : (
								<>
									Es-tu sûr de vouloir restaurer{" "}
									<strong>{count} bijou{count > 1 ? "x" : ""}</strong> ?
									<br />
									<br />
									{count > 1 ? "Ces bijoux seront remis" : "Ce bijou sera remis"}{" "}
									en statut &quot;Public&quot; et{" "}
									{count > 1 ? "redeviendront visibles" : "redeviendra visible"}{" "}
									sur la boutique.
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
							className={
								isArchiving
									? "bg-orange-600 text-white hover:bg-orange-700"
									: undefined
							}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{isArchiving ? "Archivage..." : "Restauration..."}
								</>
							) : (
								isArchiving ? "Archiver" : "Restaurer"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
