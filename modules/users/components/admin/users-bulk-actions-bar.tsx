"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff } from "lucide-react";

import { Role } from "@/app/generated/prisma/enums";
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

import { bulkChangeUserRole } from "../../actions/admin/bulk-change-user-role";

type BulkAction = "promote" | "demote";

export function UsersBulkActionsBar() {
	const { selectedIds, clear, selectedCount } = useBulkSelectionContext();
	const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
	const [state, action, isPending] = useActionState(bulkChangeUserRole, undefined);

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
		fd.set("role", target === "promote" ? Role.ADMIN : Role.USER);
		action(fd);
		setPendingAction(null);
	}

	const dialogOpen = pendingAction !== null;
	const isPromote = pendingAction === "promote";

	return (
		<>
			<BulkSelectionToolbar itemsLabel={{ singular: "utilisateur", plural: "utilisateurs" }}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction("promote")}
					disabled={isPending}
				>
					<Shield className="size-4" aria-hidden="true" />
					Promouvoir admin
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setPendingAction("demote")}
					disabled={isPending}
				>
					<ShieldOff className="size-4" aria-hidden="true" />
					Rétrograder
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
							{isPromote
								? `Promouvoir ${selectedCount} utilisateur${selectedCount > 1 ? "s" : ""} ?`
								: `Rétrograder ${selectedCount} utilisateur${selectedCount > 1 ? "s" : ""} ?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isPromote
								? `${selectedCount > 1 ? "Les comptes sélectionnés obtiendront" : "Le compte sélectionné obtiendra"} les droits administrateur (accès complet à /admin). Cette opération est sensible : utilisez avec parcimonie.`
								: `${selectedCount > 1 ? "Les comptes sélectionnés perdront" : "Le compte sélectionné perdra"} les droits administrateur. Au moins un administrateur restera actif. Votre propre compte sera automatiquement ignoré.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={() => pendingAction && handleConfirm(pendingAction)}
							disabled={isPending}
							aria-busy={isPending || undefined}
							className={
								isPromote
									? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
									: undefined
							}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{isPromote ? "Promouvoir" : "Rétrograder"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
