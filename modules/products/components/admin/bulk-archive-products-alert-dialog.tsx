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
import { useBulkArchiveProducts } from "@/modules/products/hooks/use-bulk-archive-products";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Loader2 } from "lucide-react";

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
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								{isArchiving ? (
									<>
										<p>
											Êtes-vous sûr de vouloir archiver{" "}
											<strong>{count} bijou{count > 1 ? "x" : ""}</strong> ?
										</p>
										<p>
											{count > 1 ? "Ces bijoux ne seront" : "Ce bijou ne sera"}{" "}
											plus {count > 1 ? "visibles" : "visible"} sur la boutique mais{" "}
											{count > 1 ? "resteront accessibles" : "restera accessible"}{" "}
											dans le dashboard.
										</p>
										<p className="text-muted-foreground text-xs">
											Vous pourrez les restaurer à tout moment.
										</p>
									</>
								) : (
									<>
										<p>
											Êtes-vous sûr de vouloir restaurer{" "}
											<strong>{count} bijou{count > 1 ? "x" : ""}</strong> ?
										</p>
										<p>
											{count > 1 ? "Ces bijoux seront remis" : "Ce bijou sera remis"}{" "}
											en statut &quot;Public&quot; et{" "}
											{count > 1 ? "redeviendront visibles" : "redeviendra visible"}{" "}
											sur la boutique.
										</p>
									</>
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
							disabled={isPending}
							aria-busy={isPending}
							className={
								isArchiving
									? "bg-orange-600 text-white hover:bg-orange-700"
									: undefined
							}
						>
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? (isArchiving ? "Archivage..." : "Restauration...") : (isArchiving ? "Archiver" : "Restaurer")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
