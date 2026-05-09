"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

import { bulkToggleSkusStatus } from "../../actions/bulk-toggle-skus-status";

type BulkAction = "activate" | "deactivate";

interface SkusBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

interface LastSubmission {
	ids: string[];
	targetIsActive: boolean;
}

async function runBulkToggle(ids: string[], targetIsActive: boolean) {
	const fd = new FormData();
	fd.set("skuIds", JSON.stringify(ids));
	fd.set("targetIsActive", targetIsActive ? "true" : "false");
	return bulkToggleSkusStatus(undefined, fd);
}

export function SkusBulkActionsBar({ presentation = "inline" }: SkusBulkActionsBarProps = {}) {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const lastSubmissionRef = useRef<LastSubmission | null>(null);
	const [state, action, isPending] = useActionState(bulkToggleSkusStatus, undefined);
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	useEffect(() => {
		if (!state) return;
		if (state.status === ActionStatus.SUCCESS) {
			const last = lastSubmissionRef.current;
			toast.success(state.message, {
				duration: 6000,
				action: last
					? {
							label: "Annuler",
							onClick: async () => {
								const result = await runBulkToggle(last.ids, !last.targetIsActive);
								if (result.status === ActionStatus.SUCCESS) {
									toast.success("Action annulée");
								} else {
									toast.error(result.message);
								}
							},
						}
					: undefined,
			});
			lastSubmissionRef.current = null;
			clear();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, clear]);

	function handleConfirm(target: BulkAction) {
		const ids = Array.from(selectedIds);
		const targetIsActive = target === "activate";
		lastSubmissionRef.current = { ids, targetIsActive };
		const fd = new FormData();
		fd.set("skuIds", JSON.stringify(ids));
		fd.set("targetIsActive", targetIsActive ? "true" : "false");
		action(fd);
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
