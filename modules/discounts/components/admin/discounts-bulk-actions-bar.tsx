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

import { bulkToggleDiscountsStatus } from "../../actions/bulk-toggle-discounts-status";

type BulkAction = "activate" | "deactivate";

interface DiscountsBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function DiscountsBulkActionsBar({
	presentation = "inline",
}: DiscountsBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkToggleDiscountsStatus);
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
		fd.set("discountIds", JSON.stringify(ids));
		fd.set("targetIsActive", target === "activate" ? "true" : "false");
		pendingCtx?.startPending(ids, target);
		submit(fd);
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
					Allumer la promo
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("deactivate")}
					disabled={isPending || noSelection}
				>
					<PowerOff className="size-4" aria-hidden="true" />
					Ranger la promo
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
								? `Allumer ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`
								: `Ranger ${selectedCount} code${selectedCount > 1 ? "s" : ""} promo ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les codes allumés seront" : "Le code allumé sera"} de nouveau utilisable${selectedCount > 1 ? "s" : ""} par les clients à la caisse.`
								: `${selectedCount > 1 ? "Les codes rangés ne seront" : "Le code rangé ne sera"} plus utilisable${selectedCount > 1 ? "s" : ""} et ne se réactive${selectedCount > 1 ? "ront" : "ra"} pas automatiquement.`}
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
							{isActivate ? "Allumer la promo" : "Ranger la promo"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
