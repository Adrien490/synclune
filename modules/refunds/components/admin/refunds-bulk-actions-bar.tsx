"use client";

import { useActionState, useEffect, useState } from "react";
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
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

import { bulkApproveRefunds } from "../../actions/bulk-approve-refunds";

interface RefundsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function RefundsBulkActionsBar({
	presentation = "inline",
}: RefundsBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [state, action, isPending] = useActionState(bulkApproveRefunds, undefined);
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

	function handleConfirm() {
		const fd = new FormData();
		fd.set("refundIds", JSON.stringify(Array.from(selectedIds)));
		action(fd);
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
					Approuver
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={confirmOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setConfirmOpen(false);
				}}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Approuver {selectedCount} remboursement{selectedCount > 1 ? "s" : ""} ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Les remboursements <strong>en attente</strong> sélectionnés passeront au statut
							APPROUVÉ. Le <strong>traitement Stripe effectif reste manuel</strong> (chaque
							remboursement doit être traité individuellement via sa fiche pour déclencher le refund
							Stripe). Les autres statuts seront ignorés.
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
							Approuver
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
