"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArchiveRestore, ArchiveX, Loader2 } from "lucide-react";

import { ProductStatus } from "@/app/generated/prisma/enums";
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

import { bulkArchiveProducts } from "../../actions/bulk-archive-products";

type BulkAction = "ARCHIVED" | "PUBLIC";

interface ProductsBulkActionsBarProps {
	/** @default "inline" — desktop. `"bottom-bar"` rend les boutons full-width pour mobile selection. */
	presentation?: "inline" | "bottom-bar";
}

interface LastSubmission {
	ids: string[];
	targetStatus: BulkAction;
}

async function runBulkArchive(ids: string[], targetStatus: BulkAction) {
	const fd = new FormData();
	fd.set("productIds", JSON.stringify(ids));
	fd.set("targetStatus", targetStatus);
	return bulkArchiveProducts(undefined, fd);
}

export function ProductsBulkActionsBar({ presentation = "inline" }: ProductsBulkActionsBarProps) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const lastSubmissionRef = useRef<LastSubmission | null>(null);

	const [state, action, isPending] = useActionState(bulkArchiveProducts, undefined);

	useEffect(() => {
		if (!state) return;
		if (state.status === ActionStatus.SUCCESS) {
			const last = lastSubmissionRef.current;
			const undoTarget: BulkAction | null = last
				? last.targetStatus === "ARCHIVED"
					? "PUBLIC"
					: "ARCHIVED"
				: null;

			toast.success(state.message, {
				duration: 6000,
				action:
					last && undoTarget
						? {
								label: "Annuler",
								onClick: async () => {
									const result = await runBulkArchive(last.ids, undoTarget);
									if (result.status === ActionStatus.SUCCESS) {
										toast.success("Action annulée");
									} else {
										toast.error(result.message);
									}
								},
							}
						: undefined,
			});
			lastSubmissionRef.current = null;
			clear();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, clear]);

	function handleConfirm(targetStatus: BulkAction) {
		const ids = Array.from(selectedIds);
		lastSubmissionRef.current = { ids, targetStatus };
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(ids));
		fd.set("targetStatus", targetStatus);
		action(fd);
		setPendingAction(null);
	}

	const archiving = pendingAction === ProductStatus.ARCHIVED;
	const restoring = pendingAction === ProductStatus.PUBLIC;
	const dialogOpen = archiving || restoring;
	const dialogIsArchive = archiving;
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "produit", plural: "produits" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction(ProductStatus.PUBLIC)}
					disabled={isPending || noSelection}
				>
					<ArchiveRestore className="size-4" aria-hidden="true" />
					Restaurer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size={buttonSize}
					onClick={() => setPendingAction(ProductStatus.ARCHIVED)}
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
				tone={dialogIsArchive ? "warning" : "success"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={dialogIsArchive ? ArchiveX : ArchiveRestore} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{dialogIsArchive
								? `Archiver ${selectedCount} produit${selectedCount > 1 ? "s" : ""} ?`
								: `Restaurer ${selectedCount} produit${selectedCount > 1 ? "s" : ""} ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
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
							{dialogIsArchive ? "Archiver" : "Restaurer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
