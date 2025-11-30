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
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";

export const ARCHIVE_PRODUCT_DIALOG_ID = "archive-product";

interface ArchiveProductData {
	productId: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
	[key: string]: unknown;
}

export function ArchiveProductAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveProductData>(
		ARCHIVE_PRODUCT_DIALOG_ID
	);

	const { action, isPending } = useToggleProductStatus({
		onSuccess: () => {
			archiveDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			archiveDialog.close();
		}
	};

	const isArchiving = archiveDialog.data?.productStatus !== "ARCHIVED";
	const targetStatus: "ARCHIVED" | "PUBLIC" = isArchiving
		? "ARCHIVED"
		: "PUBLIC";

	return (
		<AlertDialog open={archiveDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="productId"
						value={archiveDialog.data?.productId ?? ""}
					/>
					<input
						type="hidden"
						name="currentStatus"
						value={archiveDialog.data?.productStatus ?? ""}
					/>
					<input type="hidden" name="targetStatus" value={targetStatus} />

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isArchiving ? "Archiver le bijou" : "Désarchiver le bijou"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isArchiving ? (
								<>
									Es-tu sûr de vouloir archiver le bijou{" "}
									<strong>
										&quot;{archiveDialog.data?.productTitle}&quot;
									</strong>{" "}
									?
									<br />
									<br />
									Le bijou ne sera plus visible sur la boutique mais restera
									accessible dans le dashboard.
									<br />
									<br />
									<span className="text-muted-foreground text-xs">
										Tu pourras le restaurer à tout moment.
									</span>
								</>
							) : (
								<>
									Es-tu sûr de vouloir désarchiver le bijou{" "}
									<strong>
										&quot;{archiveDialog.data?.productTitle}&quot;
									</strong>{" "}
									?
									<br />
									<br />
									Le bijou sera remis en statut &quot;Public&quot; et
									redeviendra visible sur la boutique.
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
								isArchiving ? "Archiver" : "Désarchiver"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
