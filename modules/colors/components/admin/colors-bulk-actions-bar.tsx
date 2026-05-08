"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Power, PowerOff } from "lucide-react";

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

import { bulkToggleColorsStatus } from "../../actions/bulk-toggle-colors-status";

type BulkAction = "activate" | "deactivate";

interface ColorsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function ColorsBulkActionsBar({ presentation = "inline" }: ColorsBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkToggleColorsStatus, undefined);
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

	function handleConfirm(target: BulkAction) {
		const fd = new FormData();
		fd.set("colorIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetIsActive", target === "activate" ? "true" : "false");
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "couleur", plural: "couleurs" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("activate")}
					disabled={isPending || noSelection}
				>
					<Power className="size-4" aria-hidden="true" />
					Activer
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("deactivate")}
					disabled={isPending || noSelection}
				>
					<PowerOff className="size-4" aria-hidden="true" />
					Désactiver
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={dialogOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingAction(null);
				}}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isActivate
								? `Activer ${selectedCount} couleur${selectedCount > 1 ? "s" : ""} ?`
								: `Désactiver ${selectedCount} couleur${selectedCount > 1 ? "s" : ""} ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les couleurs activées seront" : "La couleur activée sera"} disponible${selectedCount > 1 ? "s" : ""} pour les nouvelles variantes produits.`
								: `${selectedCount > 1 ? "Les couleurs désactivées ne seront" : "La couleur désactivée ne sera"} plus proposée${selectedCount > 1 ? "s" : ""} dans les nouvelles variantes. Les variantes existantes restent inchangées.`}
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
							{isActivate ? "Activer" : "Désactiver"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
