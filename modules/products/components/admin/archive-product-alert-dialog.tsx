"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";

export const ARCHIVE_PRODUCT_DIALOG_ID = "archive-product";

interface ArchiveProductData {
	productId: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
	[key: string]: unknown;
}

export function ArchiveProductAlertDialog() {
	const archiveDialog = useAlertDialog<ArchiveProductData>(ARCHIVE_PRODUCT_DIALOG_ID);
	const { action } = useToggleProductStatus();

	const isArchiving = archiveDialog.data?.productStatus !== "ARCHIVED";
	// Restauration -> DRAFT : l'archivage a desactive toutes les variantes, donc
	// viser PUBLIC echouait systematiquement (validateProductForPublication exige
	// >= 1 variante active). Cf. docstring de toggle-product-status.ts.
	const targetStatus: "ARCHIVED" | "DRAFT" = isArchiving ? "ARCHIVED" : "DRAFT";

	return (
		<ConfirmDialog
			open={archiveDialog.isOpen}
			onClose={archiveDialog.close}
			action={action}
			tone={isArchiving ? "warning" : "neutral"}
			fields={{
				productId: archiveDialog.data?.productId,
				currentStatus: archiveDialog.data?.productStatus,
				targetStatus,
			}}
			title={isArchiving ? "Archiver le bijou" : "Désarchiver le bijou"}
			confirmLabel={isArchiving ? "Archiver" : "Désarchiver"}
			descriptionClassName="space-y-3"
			description={
				isArchiving ? (
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
							Le bijou sera remis en statut &quot;Brouillon&quot;. Il ne sera pas visible sur la
							boutique.
						</p>
						<p className="text-muted-foreground text-xs">
							Ses variantes ont été désactivées lors de l&apos;archivage. Réactivez-en au moins une
							(avec du stock et une image) depuis « Gérer variantes », puis publiez-le.
						</p>
					</>
				)
			}
		/>
	);
}
