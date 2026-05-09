"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";
import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";

export const ARCHIVE_PRODUCT_DIALOG_ID = "archive-product";

interface ArchiveProductData {
	productId: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
	[key: string]: unknown;
}

export function ArchiveProductAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveProductData>(ARCHIVE_PRODUCT_DIALOG_ID);

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
	const targetStatus: "ARCHIVED" | "PUBLIC" = isArchiving ? "ARCHIVED" : "PUBLIC";

	return (
		<ResponsiveAlertDialog
			open={archiveDialog.isOpen}
			onOpenChange={handleOpenChange}
			tone={isArchiving ? "warning" : "success"}
		>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="productId" value={archiveDialog.data?.productId ?? ""} />
					<input
						type="hidden"
						name="currentStatus"
						value={archiveDialog.data?.productStatus ?? ""}
					/>
					<input type="hidden" name="targetStatus" value={targetStatus} />

					<ResponsiveAlertDialogHeroIcon icon={isArchiving ? Archive : ArchiveRestore} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isArchiving ? "Archiver le bijou" : "Désarchiver le bijou"}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-3">
								{isArchiving ? (
									<>
										<p>
											Êtes-vous sûr de vouloir archiver le bijou{" "}
											<strong>&quot;{archiveDialog.data?.productTitle}&quot;</strong> ?
										</p>
										<p>
											Le bijou ne sera plus visible sur la boutique mais restera accessible dans le
											dashboard.
										</p>
										<p className="text-muted-foreground text-xs">
											Vous pourrez le restaurer à tout moment.
										</p>
									</>
								) : (
									<>
										<p>
											Êtes-vous sûr de vouloir désarchiver le bijou{" "}
											<strong>&quot;{archiveDialog.data?.productTitle}&quot;</strong> ?
										</p>
										<p>
											Le bijou sera remis en statut &quot;Public&quot; et redeviendra visible sur la
											boutique.
										</p>
									</>
								)}
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending
								? isArchiving
									? "Archivage…"
									: "Restauration…"
								: isArchiving
									? "Archiver"
									: "Désarchiver"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
