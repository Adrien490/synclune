"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, EyeOff, Loader2 } from "lucide-react";

import { ReviewStatus } from "@/app/generated/prisma/browser";
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

import { bulkModerateReviews } from "../../actions/bulk-moderate-reviews";

type BulkAction = "PUBLISHED" | "HIDDEN";

interface ReviewsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function ReviewsBulkActionsBar({
	presentation = "inline",
}: ReviewsBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkModerateReviews);
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	const wasPendingRef = useRef(false);
	useEffect(() => {
		if (wasPendingRef.current && !isPending) {
			pendingCtx?.clearPending();
		}
		wasPendingRef.current = isPending;
	}, [isPending, pendingCtx]);

	useEffect(() => {
		return () => {
			pendingCtx?.clearPending();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function handleConfirm(target: BulkAction) {
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("reviewIds", JSON.stringify(ids));
		fd.set("targetStatus", target);
		pendingCtx?.startPending(ids, target === ReviewStatus.PUBLISHED ? "publish" : "hide");
		submit(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isHide = pendingAction === ReviewStatus.HIDDEN;

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "avis", plural: "avis" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction(ReviewStatus.PUBLISHED)}
					disabled={isPending || noSelection}
				>
					<CircleCheck className="size-4" aria-hidden="true" />
					Donner la voix
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction(ReviewStatus.HIDDEN)}
					disabled={isPending || noSelection}
				>
					<EyeOff className="size-4" aria-hidden="true" />
					Mettre en sourdine
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={dialogOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingAction(null);
				}}
				tone={isHide ? "warning" : "success"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={isHide ? EyeOff : CircleCheck} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isHide
								? `Mettre ${selectedCount} avis en sourdine ?`
								: `Donner la voix à ${selectedCount} avis ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isHide
								? `${selectedCount > 1 ? "Les avis mis en sourdine ne seront" : "L'avis mis en sourdine ne sera"} plus visible${selectedCount > 1 ? "s" : ""} en boutique. Les notes moyennes seront recalculées.`
								: `${selectedCount > 1 ? "Les avis publiés seront" : "L'avis publié sera"} de nouveau visible${selectedCount > 1 ? "s" : ""} en boutique et compteront dans les notes moyennes.`}
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
							{isHide ? "Mettre en sourdine" : "Donner la voix"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
