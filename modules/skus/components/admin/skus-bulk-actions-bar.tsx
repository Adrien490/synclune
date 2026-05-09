"use client";

import { useState } from "react";
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
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useBulkActionWithToast } from "@/shared/hooks/use-bulk-action-with-toast";

import { bulkToggleSkusStatus } from "../../actions/bulk-toggle-skus-status";

type BulkAction = "activate" | "deactivate";

interface SkusBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

interface LastSubmission {
	ids: string[];
	targetIsActive: boolean;
}

export function SkusBulkActionsBar({ presentation = "inline" }: SkusBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast<LastSubmission>(bulkToggleSkusStatus, {
		undo: {
			buildUndoFormData: (snap) => {
				const fd = new FormData();
				fd.set("skuIds", JSON.stringify(snap.ids));
				fd.set("targetIsActive", snap.targetIsActive ? "false" : "true");
				return fd;
			},
		},
	});
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	function handleConfirm(target: BulkAction) {
		const ids = Array.from(selectedIds);
		const targetIsActive = target === "activate";
		const fd = new FormData();
		fd.set("skuIds", JSON.stringify(ids));
		fd.set("targetIsActive", targetIsActive ? "true" : "false");
		submit(fd, { ids, targetIsActive });
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "variante", plural: "variantes" }}
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
				tone={isActivate ? "success" : "warning"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={isActivate ? Power : PowerOff} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isActivate
								? `Activer ${selectedCount} variante${selectedCount > 1 ? "s" : ""} ?`
								: `Désactiver ${selectedCount} variante${selectedCount > 1 ? "s" : ""} ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les variantes activées seront" : "La variante activée sera"} de nouveau achetable${selectedCount > 1 ? "s" : ""} en boutique.`
								: `${selectedCount > 1 ? "Les variantes désactivées ne seront" : "La variante désactivée ne sera"} plus achetable${selectedCount > 1 ? "s" : ""}. Les variantes par défaut et celles indispensables à un produit public sont automatiquement protégées.`}
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
