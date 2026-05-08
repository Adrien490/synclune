"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

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

import { bulkCancelOrders } from "../../actions/bulk-cancel-orders";

interface OrdersBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function OrdersBulkActionsBar({ presentation = "inline" }: OrdersBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [state, action, isPending] = useActionState(bulkCancelOrders, undefined);
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
		fd.set("orderIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("reason", "Annulation en lot via admin");
		action(fd);
		setConfirmOpen(false);
	}

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "commande", plural: "commandes" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="destructive"
					size={buttonSize}
					onClick={() => setConfirmOpen(true)}
					disabled={isPending || noSelection}
				>
					<XCircle className="size-4" aria-hidden="true" />
					Annuler
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
							Annuler {selectedCount} commande{selectedCount > 1 ? "s" : ""} ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Seules les commandes <strong>en attente non payées</strong> seront annulées. Le stock
							sera restauré, les codes promo libérés, et un email d'annulation envoyé à chaque
							client. Les commandes déjà payées ou expédiées seront ignorées et devront être
							annulées individuellement.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>
							Conserver
						</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={handleConfirm}
							disabled={isPending}
							aria-busy={isPending || undefined}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Annuler les commandes
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
