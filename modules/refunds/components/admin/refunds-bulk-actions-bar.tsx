"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

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

import { bulkApproveRefunds } from "../../actions/bulk-approve-refunds";

export function RefundsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [state, action, isPending] = useActionState(bulkApproveRefunds, undefined);

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
			<BulkSelectionToolbar itemsLabel={{ singular: "remboursement", plural: "remboursements" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setConfirmOpen(true)}
					disabled={isPending}
				>
					<CheckCircle className="size-4" aria-hidden="true" />
					Approuver
				</Button>
			</BulkSelectionToolbar>

			<AlertDialog
				open={confirmOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setConfirmOpen(false);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Approuver {selectedCount} remboursement{selectedCount > 1 ? "s" : ""} ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Les remboursements <strong>en attente</strong> sélectionnés passeront au statut
							APPROUVÉ. Le <strong>traitement Stripe effectif reste manuel</strong> (chaque
							remboursement doit être traité individuellement via sa fiche pour déclencher le refund
							Stripe). Les autres statuts seront ignorés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={handleConfirm}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Approuver
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
