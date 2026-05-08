"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

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

import { bulkCancelOrders } from "../../actions/bulk-cancel-orders";

export function OrdersBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [state, action, isPending] = useActionState(bulkCancelOrders, undefined);

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
		fd.set("orderIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("reason", "Annulation en lot via admin");
		action(fd);
		setConfirmOpen(false);
	}

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "commande", plural: "commandes" }}>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={() => setConfirmOpen(true)}
					disabled={isPending}
				>
					<XCircle className="size-4" aria-hidden="true" />
					Annuler
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
							Annuler {selectedCount} commande{selectedCount > 1 ? "s" : ""} ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Seules les commandes <strong>en attente non payées</strong> seront annulées. Le stock
							sera restauré, les codes promo libérés, et un email d'annulation envoyé à chaque
							client. Les commandes déjà payées ou expédiées seront ignorées et devront être
							annulées individuellement.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Conserver</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={handleConfirm}
							disabled={isPending}
							aria-busy={isPending || undefined}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Annuler les commandes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
