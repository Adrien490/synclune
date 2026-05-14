"use client";

import { useEffect, useRef, useState } from "react";
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
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { useBulkActionWithToast } from "@/shared/hooks/use-bulk-action-with-toast";

import { bulkArchiveCollections } from "../../actions/bulk-archive-collections";

type BulkAction = "ARCHIVED" | "PUBLIC";

interface CollectionsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function CollectionsBulkActionsBar({
	presentation = "inline",
}: CollectionsBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkArchiveCollections);
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	// Clear pending UI flag when the action lifecycle completes.
	const wasPendingRef = useRef(false);
	useEffect(() => {
		if (wasPendingRef.current && !isPending) {
			pendingCtx?.clearPending();
		}
		wasPendingRef.current = isPending;
	}, [isPending, pendingCtx]);

	// Évite un pending stale si l'admin navigue ailleurs pendant un bulk en cours.
	useEffect(() => {
		return () => {
			pendingCtx?.clearPending();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function handleConfirm(target: BulkAction) {
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("collectionIds", JSON.stringify(ids));
		fd.set("targetStatus", target);
		pendingCtx?.startPending(ids, target === "ARCHIVED" ? "archive" : "restore");
		submit(fd);
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
					Réexposer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size={buttonSize}
					onClick={() => setPendingAction(CollectionStatus.ARCHIVED)}
					disabled={isPending || noSelection}
				>
					<ArchiveX className="size-4" aria-hidden="true" />
					Remiser
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
								? `Remiser ${selectedCount} collection${selectedCount > 1 ? "s" : ""} à l'atelier ?`
								: `Réexposer ${selectedCount} collection${selectedCount > 1 ? "s" : ""} en vitrine ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isArchive
								? `${selectedCount > 1 ? "Les collections remisées" : "La collection remisée"} ne ${selectedCount > 1 ? "seront" : "sera"} plus visible${selectedCount > 1 ? "s" : ""} en boutique. Vous pourrez ${selectedCount > 1 ? "les" : "la"} réexposer à tout moment.`
								: `${selectedCount > 1 ? "Les collections sélectionnées seront remises" : "La collection sélectionnée sera remise"} en vitrine et redeviendr${selectedCount > 1 ? "ont" : "a"} visible${selectedCount > 1 ? "s" : ""} en boutique.`}
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
							{isArchive ? "Remiser" : "Réexposer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
