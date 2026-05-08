"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Power, PowerOff } from "lucide-react";

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

import { bulkToggleDiscountsStatus } from "../../actions/bulk-toggle-discounts-status";

type BulkAction = "activate" | "deactivate";

export function DiscountsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkToggleDiscountsStatus, undefined);

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
		fd.set("discountIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetIsActive", target === "activate" ? "true" : "false");
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "code promo", plural: "codes promo" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction("activate")}
					disabled={isPending}
				>
					<Power className="size-4" aria-hidden="true" />
					Activer
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction("deactivate")}
					disabled={isPending}
				>
					<PowerOff className="size-4" aria-hidden="true" />
					Désactiver
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
							{isActivate
								? `Activer ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`
								: `Désactiver ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les codes activés seront" : "Le code activé sera"} de nouveau utilisable${selectedCount > 1 ? "s" : ""} par les clients.`
								: `${selectedCount > 1 ? "Les codes désactivés ne seront" : "Le code désactivé ne sera"} plus utilisable${selectedCount > 1 ? "s" : ""} et ne ${selectedCount > 1 ? "seront pas" : "sera pas"} réactivé${selectedCount > 1 ? "s" : ""} automatiquement.`}
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
							{isActivate ? "Activer" : "Désactiver"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
