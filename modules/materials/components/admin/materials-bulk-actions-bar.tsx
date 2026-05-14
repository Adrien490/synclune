"use client";

import { useEffect, useRef, useState } from "react";
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
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { useBulkActionWithToast } from "@/shared/hooks/use-bulk-action-with-toast";

import { bulkToggleMaterialsStatus } from "../../actions/bulk-toggle-materials-status";

type BulkAction = "activate" | "deactivate";

interface MaterialsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function MaterialsBulkActionsBar({
	presentation = "inline",
}: MaterialsBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkToggleMaterialsStatus);
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

	function handleConfirm(target: BulkAction) {
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("ids", JSON.stringify(ids));
		fd.set("isActive", target === "activate" ? "true" : "false");
		pendingCtx?.startPending(ids, target);
		submit(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isActivate = pendingAction === "activate";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "matériau", plural: "matériaux" }}
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
					Réintégrer à l'inventaire
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("deactivate")}
					disabled={isPending || noSelection}
				>
					<PowerOff className="size-4" aria-hidden="true" />
					Mettre en stock dormant
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
								? `Réintégrer ${selectedCount} matière${selectedCount > 1 ? "s" : ""} aux matières premières ?`
								: `Mettre ${selectedCount} matière${selectedCount > 1 ? "s" : ""} en stock dormant ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les matières réintégrées seront" : "La matière réintégrée sera"} disponible${selectedCount > 1 ? "s" : ""} à l'atelier pour les nouvelles créations.`
								: `${selectedCount > 1 ? "Les matières mises au repos ne seront" : "La matière mise au repos ne sera"} plus proposée${selectedCount > 1 ? "s" : ""} dans les nouveaux bijoux. Les pièces existantes restent intactes.`}
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
							{isActivate ? "Réintégrer" : "Mettre au repos"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
