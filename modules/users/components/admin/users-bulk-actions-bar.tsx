"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Shield, ShieldOff } from "lucide-react";

import { Role } from "@/app/generated/prisma/enums";
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

import { bulkChangeUserRole } from "../../actions/admin/bulk-change-user-role";

type BulkAction = "promote" | "demote";

interface UsersBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function UsersBulkActionsBar({ presentation = "inline" }: UsersBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pendingCtx = useAdminListPendingContextOptional();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkChangeUserRole);
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
		fd.set("role", target === "promote" ? Role.ADMIN : Role.USER);
		pendingCtx?.startPending(ids, target);
		submit(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isPromote = pendingAction === "promote";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "client", plural: "clients" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("promote")}
					disabled={isPending || noSelection}
				>
					<Shield className="size-4" aria-hidden="true" />
					Promouvoir au comptoir
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("demote")}
					disabled={isPending || noSelection}
				>
					<ShieldOff className="size-4" aria-hidden="true" />
					Repasser visiteur
				</Button>
			</BulkSelectionToolbar>

			<ResponsiveAlertDialog
				open={dialogOpen}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingAction(null);
				}}
				tone={isPromote ? "warning" : "info"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={isPromote ? Shield : ShieldOff} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isPromote
								? `Promouvoir ${selectedCount} client${selectedCount > 1 ? "s" : ""} au comptoir ?`
								: `Repasser ${selectedCount} client${selectedCount > 1 ? "s" : ""} en visiteur ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isPromote
								? `${selectedCount > 1 ? "Les comptes sélectionnés rejoindront" : "Le compte sélectionné rejoindra"} l'équipe atelier avec accès complet à /admin. Opération sensible : utilisez avec parcimonie.`
								: `${selectedCount > 1 ? "Les comptes sélectionnés perdront" : "Le compte sélectionné perdra"} les droits atelier. Au moins un membre d'équipe restera actif. Votre propre compte est automatiquement préservé.`}
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
							{isPromote ? "Promouvoir au comptoir" : "Repasser visiteur"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
