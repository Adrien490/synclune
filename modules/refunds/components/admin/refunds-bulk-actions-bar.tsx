"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

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

import { bulkApproveRefunds } from "../../actions/bulk-approve-refunds";

interface RefundsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function RefundsBulkActionsBar({
	presentation = "inline",
}: RefundsBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const { submit, isPending } = useBulkActionWithToast(bulkApproveRefunds);
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

	function handleConfirm() {
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("refundIds", JSON.stringify(ids));
		pendingCtx?.startPending(ids, "approve");
		submit(fd);
		setConfirmOpen(false);
	}

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "remboursement", plural: "remboursements" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setConfirmOpen(true)}
					disabled={isPending || noSelection}
				>
					<CheckCircle className="size-4" aria-hidden="true" />
					Valider le remboursement
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={confirmOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setConfirmOpen(false);
				}}
				tone="success"
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={CheckCircle} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Valider {selectedCount} remboursement{selectedCount > 1 ? "s" : ""} en attente ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Les remboursements <strong>en attente</strong> sélectionnés passeront au statut
							APPROUVÉ. Le <strong>règlement Stripe effectif reste manuel</strong> (chaque
							remboursement doit être traité individuellement via sa fiche pour déclencher le
							versement). Les autres statuts seront automatiquement ignorés.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={handleConfirm}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Valider
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
