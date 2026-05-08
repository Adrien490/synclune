"use client";

import { useActionState, useEffect, useState } from "react";
import { CircleCheck, EyeOff, Loader2 } from "lucide-react";

import { ReviewStatus } from "@/app/generated/prisma/enums";
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

import { bulkModerateReviews } from "../../actions/bulk-moderate-reviews";

type BulkAction = "PUBLISHED" | "HIDDEN";

export function ReviewsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkModerateReviews, undefined);

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
		fd.set("reviewIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetStatus", target);
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isHide = pendingAction === ReviewStatus.HIDDEN;

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "avis", plural: "avis" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction(ReviewStatus.PUBLISHED)}
					disabled={isPending}
				>
					<CircleCheck className="size-4" aria-hidden="true" />
					Publier
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction(ReviewStatus.HIDDEN)}
					disabled={isPending}
				>
					<EyeOff className="size-4" aria-hidden="true" />
					Masquer
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
							{isHide ? `Masquer ${selectedCount} avis ?` : `Publier ${selectedCount} avis ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isHide
								? `${selectedCount > 1 ? "Les avis masqués ne seront" : "L'avis masqué ne sera"} plus visible${selectedCount > 1 ? "s" : ""} en boutique. Les notes moyennes seront recalculées.`
								: `${selectedCount > 1 ? "Les avis publiés seront" : "L'avis publié sera"} de nouveau visible${selectedCount > 1 ? "s" : ""} en boutique et compteront dans les notes moyennes.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={() => pendingAction && handleConfirm(pendingAction)}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{isHide ? "Masquer" : "Publier"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
