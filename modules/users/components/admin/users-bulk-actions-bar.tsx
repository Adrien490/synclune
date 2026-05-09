"use client";

import { useState } from "react";
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
import { useBulkActionWithToast } from "@/shared/hooks/use-bulk-action-with-toast";

import { bulkChangeUserRole } from "../../actions/admin/bulk-change-user-role";

type BulkAction = "promote" | "demote";

interface UsersBulkActionsBarProps {
	presentation?: "inline" | "bottom-bar";
}

export function UsersBulkActionsBar({ presentation = "inline" }: UsersBulkActionsBarProps = {}) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const { submit, isPending } = useBulkActionWithToast(bulkChangeUserRole);
	const noSelection = selectedCount === 0;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";

	function handleConfirm(target: BulkAction) {
		const fd = new FormData();
		fd.set("ids", JSON.stringify(Array.from(selectedIds)));
		fd.set("role", target === "promote" ? Role.ADMIN : Role.USER);
		submit(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isPromote = pendingAction === "promote";

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "utilisateur", plural: "utilisateurs" }}
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
					Promouvoir admin
				</Button>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingAction("demote")}
					disabled={isPending || noSelection}
				>
					<ShieldOff className="size-4" aria-hidden="true" />
					Rétrograder
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
								? `Promouvoir ${selectedCount} utilisateur${selectedCount > 1 ? "s" : ""} ?`
								: `Rétrograder ${selectedCount} utilisateur${selectedCount > 1 ? "s" : ""} ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{isPromote
								? `${selectedCount > 1 ? "Les comptes sélectionnés obtiendront" : "Le compte sélectionné obtiendra"} les droits administrateur (accès complet à /admin). Cette opération est sensible : utilisez avec parcimonie.`
								: `${selectedCount > 1 ? "Les comptes sélectionnés perdront" : "Le compte sélectionné perdra"} les droits administrateur. Au moins un administrateur restera actif. Votre propre compte sera automatiquement ignoré.`}
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
							{isPromote ? "Promouvoir" : "Rétrograder"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
