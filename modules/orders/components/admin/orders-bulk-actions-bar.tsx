"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Loader2, XCircle } from "lucide-react";

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

import { bulkCancelOrders } from "../../actions/bulk-cancel-orders";

interface OrdersBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function OrdersBulkActionsBar({ presentation = "inline" }: OrdersBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const { submit, isPending } = useBulkActionWithToast(bulkCancelOrders);
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
		fd.set("orderIds", JSON.stringify(ids));
		fd.set("reason", "Annulation en lot via admin");
		pendingCtx?.startPending(ids, "cancel");
		submit(fd);
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
					Annuler la commande
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={confirmOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setConfirmOpen(false);
				}}
				tone="warning"
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={Ban} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Annuler {selectedCount} commande{selectedCount > 1 ? "s" : ""} en attente ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Seules les commandes <strong>en attente non réglées</strong> seront annulées. Les
							pièces remontent à l'atelier (stock restauré), les codes promo sont libérés et un
							email d'annulation est adressé au client. Les commandes déjà réglées ou expédiées
							seront automatiquement ignorées et devront être annulées individuellement.
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
