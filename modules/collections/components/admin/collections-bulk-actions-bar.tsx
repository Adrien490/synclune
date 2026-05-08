"use client";

import { useActionState, useEffect, useState } from "react";
import { ArchiveRestore, ArchiveX, Loader2 } from "lucide-react";

import { CollectionStatus } from "@/app/generated/prisma/enums";
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

import { bulkArchiveCollections } from "../../actions/bulk-archive-collections";

type BulkAction = "ARCHIVED" | "PUBLIC";

export function CollectionsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkArchiveCollections, undefined);

	useEffect(() => {
		if (!state) return;
		if (state.status === ActionStatus.SUCCESS) {
			toast.success(state.message);
			clear();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, clear]);

	function handleConfirm(target: BulkAction) {
		const fd = new FormData();
		fd.set("collectionIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetStatus", target);
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isArchive = pendingAction === CollectionStatus.ARCHIVED;

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "collection", plural: "collections" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction(CollectionStatus.PUBLIC)}
					disabled={isPending}
				>
					<ArchiveRestore className="size-4" aria-hidden="true" />
					Restaurer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={() => setPendingAction(CollectionStatus.ARCHIVED)}
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
							{isArchive
								? `Archiver ${selectedCount} collection${selectedCount > 1 ? "s" : ""} ?`
								: `Restaurer ${selectedCount} collection${selectedCount > 1 ? "s" : ""} ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isArchive
								? `${selectedCount > 1 ? "Les collections archivées" : "La collection archivée"} ne ${selectedCount > 1 ? "seront" : "sera"} plus visible${selectedCount > 1 ? "s" : ""} sur la boutique. Vous pourrez ${selectedCount > 1 ? "les" : "la"} restaurer à tout moment.`
								: `${selectedCount > 1 ? "Les collections sélectionnées" : "La collection sélectionnée"} ${selectedCount > 1 ? "seront" : "sera"} repassée${selectedCount > 1 ? "s" : ""} en statut public.`}
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
								isArchive
									? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
									: undefined
							}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{isArchive ? "Archiver" : "Restaurer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
