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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";
import { Spinner } from "@/shared/components/ui/spinner";

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
	// Restauration -> DRAFT : l'archivage a desactive toutes les variantes, donc
	// viser PUBLIC echouait systematiquement (validateProductForPublication exige
	// >= 1 variante active). Cf. docstring de toggle-product-status.ts.
	const targetStatus: "ARCHIVED" | "DRAFT" = isArchiving ? "ARCHIVED" : "DRAFT";

	return (
		<ResponsiveAlertDialog
			open={archiveDialog.isOpen}
			onOpenChange={handleOpenChange}
			tone={isArchiving ? "warning" : "neutral"}
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

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isArchiving ? "Archiver le bijou" : "Désarchiver le bijou"}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div className="space-y-3" />}>
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
										Ses variantes seront désactivées. Vous pourrez le restaurer à tout moment : il
										reviendra en brouillon.
									</p>
								</>
							) : (
								<>
									<p>
										Êtes-vous sûr de vouloir désarchiver le bijou{" "}
										<strong>&quot;{archiveDialog.data?.productTitle}&quot;</strong> ?
									</p>
									<p>
										Le bijou sera remis en statut &quot;Brouillon&quot;. Il ne sera pas visible sur
										la boutique.
									</p>
									<p className="text-muted-foreground text-xs">
										Ses variantes ont été désactivées lors de l&apos;archivage. Réactivez-en au
										moins une (avec du stock et une image) depuis « Gérer variantes », puis
										publiez-le.
									</p>
								</>
							)}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
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
