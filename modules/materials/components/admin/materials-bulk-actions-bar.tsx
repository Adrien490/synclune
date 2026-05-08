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

import { bulkToggleMaterialsStatus } from "../../actions/bulk-toggle-materials-status";

type BulkAction = "activate" | "deactivate";

export function MaterialsBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkToggleMaterialsStatus, undefined);

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
		fd.set("ids", JSON.stringify(Array.from(selectedIds)));
		fd.set("isActive", target === "activate" ? "true" : "false");
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "matériau", plural: "matériaux" }}>
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
								? `Activer ${selectedCount} matériau${selectedCount > 1 ? "x" : ""} ?`
								: `Désactiver ${selectedCount} matériau${selectedCount > 1 ? "x" : ""} ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les matériaux activés seront" : "Le matériau activé sera"} disponible${selectedCount > 1 ? "s" : ""} pour les nouvelles variantes produits.`
								: `${selectedCount > 1 ? "Les matériaux désactivés ne seront" : "Le matériau désactivé ne sera"} plus proposé${selectedCount > 1 ? "s" : ""} dans les nouvelles variantes.`}
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
