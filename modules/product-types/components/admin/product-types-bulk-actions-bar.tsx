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

import { bulkToggleProductTypesStatus } from "../../actions/bulk-toggle-product-types-status";

type BulkAction = "activate" | "deactivate";

interface ProductTypesBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function ProductTypesBulkActionsBar({
	presentation = "inline",
}: ProductTypesBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkToggleProductTypesStatus);
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
		fd.set("productTypeIds", JSON.stringify(ids));
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
				itemsLabel={{ singular: "type", plural: "types" }}
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
					Rouvrir la catégorie
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("deactivate")}
					disabled={isPending || noSelection}
				>
					<PowerOff className="size-4" aria-hidden="true" />
					Mettre au repos
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
								? `Rouvrir ${selectedCount} catégorie${selectedCount > 1 ? "s" : ""} d'œuvres ?`
								: `Mettre ${selectedCount} catégorie${selectedCount > 1 ? "s" : ""} au repos ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isActivate
								? `${selectedCount > 1 ? "Les catégories rouvertes seront" : "La catégorie rouverte sera"} disponible${selectedCount > 1 ? "s" : ""} dans le catalogue d'atelier pour les nouvelles créations.`
								: `${selectedCount > 1 ? "Les catégories endormies ne seront" : "La catégorie endormie ne sera"} plus proposée${selectedCount > 1 ? "s" : ""} dans les nouveaux bijoux. Les catégories système (verrouillées) sont automatiquement préservées.`}
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
							{isActivate ? "Rouvrir la catégorie" : "Mettre au repos"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
