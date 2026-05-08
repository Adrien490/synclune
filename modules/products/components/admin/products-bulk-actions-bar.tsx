"use client";

import { useActionState, useEffect, useState } from "react";
import { ArchiveRestore, ArchiveX, Loader2 } from "lucide-react";

import { ProductStatus } from "@/app/generated/prisma/enums";
import { BulkSelectionToolbar, useBulkSelectionContext } from "@/shared/components/data-table";
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
import { Button } from "@/shared/components/ui/button";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

import { bulkArchiveProducts } from "../../actions/bulk-archive-products";

type BulkAction = "ARCHIVED" | "PUBLIC";

export function ProductsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

	const [state, action, isPending] = useActionState(bulkArchiveProducts, undefined);

	useEffect(() => {
		if (!state) return;
		if (state.status === ActionStatus.SUCCESS) {
			toast.success(state.message);
			clear();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, clear]);

	function handleConfirm(targetStatus: BulkAction) {
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetStatus", targetStatus);
		action(fd);
		setPendingAction(null);
	}

	const archiving = pendingAction === ProductStatus.ARCHIVED;
	const restoring = pendingAction === ProductStatus.PUBLIC;
	const dialogOpen = archiving || restoring;
	const dialogIsArchive = archiving;

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "produit", plural: "produits" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction(ProductStatus.PUBLIC)}
					disabled={isPending}
				>
					<ArchiveRestore className="size-4" aria-hidden="true" />
					Restaurer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={() => setPendingAction(ProductStatus.ARCHIVED)}
					disabled={isPending}
				>
					<ArchiveX className="size-4" aria-hidden="true" />
					Archiver
				</Button>
			</BulkSelectionToolbar>

			<AlertDialog
				open={dialogOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingAction(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{dialogIsArchive
								? `Archiver ${selectedCount} produit${selectedCount > 1 ? "s" : ""} ?`
								: `Restaurer ${selectedCount} produit${selectedCount > 1 ? "s" : ""} ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{dialogIsArchive
								? `${selectedCount > 1 ? "Les produits archivés" : "Le produit archivé"} ne ${
										selectedCount > 1 ? "seront" : "sera"
									} plus visible${selectedCount > 1 ? "s" : ""} sur la boutique et ${
										selectedCount > 1 ? "leurs variantes seront" : "ses variantes seront"
									} désactivées. Vous pourrez les restaurer à tout moment.`
								: `${selectedCount > 1 ? "Les produits sélectionnés seront" : "Le produit sélectionné sera"} ${
										selectedCount > 1 ? "remis" : "remis"
									} en statut public et ${selectedCount > 1 ? "redeviendront" : "redeviendra"} visible${
										selectedCount > 1 ? "s" : ""
									} sur la boutique.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={() => pendingAction && handleConfirm(pendingAction)}
							disabled={isPending}
							aria-busy={isPending || undefined}
							className={
								dialogIsArchive
									? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
									: undefined
							}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{dialogIsArchive ? "Archiver" : "Restaurer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
