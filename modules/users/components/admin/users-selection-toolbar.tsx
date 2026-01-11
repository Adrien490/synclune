"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteUsers } from "@/modules/users/hooks/use-bulk-delete-users";
import { useBulkSuspendUsers } from "@/modules/users/hooks/use-bulk-suspend-users";
import { useBulkRestoreUsers } from "@/modules/users/hooks/use-bulk-restore-users";
import { useBulkChangeUserRole } from "@/modules/users/hooks/use-bulk-change-user-role";
import {
	CheckCircle2,
	Loader2,
	MoreVertical,
	RotateCcw,
	Trash2,
	XCircle,
} from "lucide-react";
import { useDialog } from "@/shared/providers/dialog-store-provider";

interface UsersSelectionToolbarProps {
	userIds: string[];
}

export function UsersSelectionToolbar({}: UsersSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const deleteDialog = useDialog("bulk-delete-users");
	const suspendDialog = useDialog("bulk-suspend-users");
	const restoreDialog = useDialog("bulk-restore-users");
	const promoteDialog = useDialog("bulk-promote-users");
	const demoteDialog = useDialog("bulk-demote-users");

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteUsers({
		onSuccess: () => {
			deleteDialog.close();
			clearSelection();
		},
	});

	const { action: suspendAction, isPending: isSuspendPending } = useBulkSuspendUsers({
		onSuccess: () => {
			suspendDialog.close();
			clearSelection();
		},
	});

	const { action: restoreAction, isPending: isRestorePending } = useBulkRestoreUsers({
		onSuccess: () => {
			restoreDialog.close();
			clearSelection();
		},
	});

	const { action: changeRoleAction, isPending: isChangeRolePending } = useBulkChangeUserRole({
		onSuccess: () => {
			promoteDialog.close();
			demoteDialog.close();
			clearSelection();
		},
	});

	const isPending = isDeletePending || isSuspendPending || isRestorePending || isChangeRolePending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} utilisateur{selectedItems.length > 1 ? "s" : ""}{" "}
					selectionne{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								Changer le role
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem onClick={() => promoteDialog.open()}>
									<CheckCircle2 className="h-4 w-4" />
									Promouvoir admin
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => demoteDialog.open()}>
									<XCircle className="h-4 w-4" />
									Retrograder utilisateur
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => suspendDialog.open()}>
							<XCircle className="h-4 w-4" />
							Suspendre
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => restoreDialog.open()}>
							<RotateCcw className="h-4 w-4" />
							Restaurer
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => deleteDialog.open()}
							variant="destructive"
						>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			{/* Delete Dialog */}
			<AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => open ? deleteDialog.open() : deleteDialog.close()}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les comptes seront desactives mais les donnees seront conservees.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								disabled={isPending}
							>
								{isDeletePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Suppression...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Suspend Dialog */}
			<AlertDialog open={suspendDialog.isOpen} onOpenChange={(open) => open ? suspendDialog.open() : suspendDialog.close()}>
				<AlertDialogContent>
					<form action={suspendAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Suspendre les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir suspendre{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les utilisateurs suspendus ne pourront plus se connecter.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isSuspendPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Suspension...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Suspendre
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Restore Dialog */}
			<AlertDialog open={restoreDialog.isOpen} onOpenChange={(open) => open ? restoreDialog.open() : restoreDialog.close()}>
				<AlertDialogContent>
					<form action={restoreAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Restaurer les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir restaurer{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les comptes supprimes ou suspendus seront reactives.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isRestorePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Restauration...
									</>
								) : (
									<>
										<RotateCcw className="mr-2 h-4 w-4" />
										Restaurer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Promote to Admin Dialog */}
			<AlertDialog open={promoteDialog.isOpen} onOpenChange={(open) => open ? promoteDialog.open() : promoteDialog.close()}>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<input type="hidden" name="role" value="ADMIN" />
						<AlertDialogHeader>
							<AlertDialogTitle>Promouvoir en administrateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir promouvoir{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								au role d&apos;administrateur ?
								<br />
								<br />
								<span className="text-amber-600 font-medium">
									Les administrateurs ont acces a toutes les fonctionnalites du
									dashboard.
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isChangeRolePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Promotion...
									</>
								) : (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Promouvoir
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Demote to User Dialog */}
			<AlertDialog open={demoteDialog.isOpen} onOpenChange={(open) => open ? demoteDialog.open() : demoteDialog.close()}>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<input type="hidden" name="role" value="USER" />
						<AlertDialogHeader>
							<AlertDialogTitle>Retrograder en utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir retrograder{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								au role d&apos;utilisateur standard ?
								<br />
								<br />
								Ils perdront l&apos;acces au dashboard administrateur.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isChangeRolePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Retrogradation...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Retrograder
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
