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

import { bulkToggleDiscountsStatus } from "../../actions/bulk-toggle-discounts-status";

type BulkAction = "activate" | "deactivate";

interface DiscountsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function DiscountsBulkActionsBar({
	presentation = "inline",
}: DiscountsBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkToggleDiscountsStatus, undefined);
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
		fd.set("discountIds", JSON.stringify(Array.from(selectedIds)));
		fd.set("targetIsActive", target === "activate" ? "true" : "false");
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "code promo", plural: "codes promo" }}
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
								? `Activer ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`
								: `Désactiver ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les codes activés seront" : "Le code activé sera"} de nouveau utilisable${selectedCount > 1 ? "s" : ""} par les clients.`
								: `${selectedCount > 1 ? "Les codes désactivés ne seront" : "Le code désactivé ne sera"} plus utilisable${selectedCount > 1 ? "s" : ""} et ne ${selectedCount > 1 ? "seront pas" : "sera pas"} réactivé${selectedCount > 1 ? "s" : ""} automatiquement.`}
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
