"use client";

import { useActionState, useEffect, useState } from "react";
import { ArchiveRestore, ArchiveX, Loader2 } from "lucide-react";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { BulkSelectionToolbar, useBulkSelectionContext } from "@/shared/components/data-table";
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
import { Button } from "@/shared/components/ui/button";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

import { bulkArchiveCollections } from "../../actions/bulk-archive-collections";

type BulkAction = "ARCHIVED" | "PUBLIC";

interface CollectionsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function CollectionsBulkActionsBar({
	presentation = "inline",
}: CollectionsBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkArchiveCollections, undefined);
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

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
			<BulkSelectionToolbar
				itemsLabel={{ singular: "collection", plural: "collections" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction(CollectionStatus.PUBLIC)}
					disabled={isPending || noSelection}
				>
					<ArchiveRestore className="size-4" aria-hidden="true" />
					Restaurer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size={buttonSize}
					onClick={() => setPendingAction(CollectionStatus.ARCHIVED)}
					disabled={isPending || noSelection}
				>
					<ArchiveX className="size-4" aria-hidden="true" />
					Archiver
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={dialogOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingAction(null);
				}}
				tone={isArchive ? "warning" : "success"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={isArchive ? ArchiveX : ArchiveRestore} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isArchive
								? `Archiver ${selectedCount} collection${selectedCount > 1 ? "s" : ""} ?`
								: `Restaurer ${selectedCount} collection${selectedCount > 1 ? "s" : ""} ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isArchive
								? `${selectedCount > 1 ? "Les collections archivées" : "La collection archivée"} ne ${selectedCount > 1 ? "seront" : "sera"} plus visible${selectedCount > 1 ? "s" : ""} sur la boutique. Vous pourrez ${selectedCount > 1 ? "les" : "la"} restaurer à tout moment.`
								: `${selectedCount > 1 ? "Les collections sélectionnées" : "La collection sélectionnée"} ${selectedCount > 1 ? "seront" : "sera"} repassée${selectedCount > 1 ? "s" : ""} en statut public.`}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={() => pendingAction && handleConfirm(pendingAction)}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{isArchive ? "Archiver" : "Restaurer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
