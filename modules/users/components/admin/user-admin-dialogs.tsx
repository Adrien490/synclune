"use client";

import { CircleCheck, CircleX, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useChangeUserRole } from "@/modules/users/hooks/use-change-user-role";
import { useDeleteUser } from "@/modules/users/hooks/use-delete-user";
import { useRestoreUser } from "@/modules/users/hooks/use-restore-user";
import { useSuspendUser } from "@/modules/users/hooks/use-suspend-user";

interface UserAdminDialogsProps {
	user: {
		id: string;
		name: string | null;
		email: string;
	};
}

/**
 * Set of 5 admin alert dialogs for a single user (delete, suspend, restore,
 * promote, demote). Each consumes its own per-user dialog ID from the global
 * store so the dialog state is isolated. Shared by row-actions desktop +
 * mobile long-press menu + detail page.
 */
export function UserAdminDialogs({ user }: UserAdminDialogsProps) {
	const deleteDialog = useDialog(`delete-user-${user.id}`);
	const suspendDialog = useDialog(`suspend-user-${user.id}`);
	const restoreDialog = useDialog(`restore-user-${user.id}`);
	const promoteDialog = useDialog(`promote-user-${user.id}`);
	const demoteDialog = useDialog(`demote-user-${user.id}`);

	const { action: deleteAction, isPending: isDeletePending } = useDeleteUser({
		onSuccess: () => deleteDialog.close(),
	});
	const { action: suspendAction, isPending: isSuspendPending } = useSuspendUser({
		onSuccess: () => suspendDialog.close(),
	});
	const { action: restoreAction, isPending: isRestorePending } = useRestoreUser({
		onSuccess: () => restoreDialog.close(),
	});
	const { action: changeRoleAction, isPending: isChangeRolePending } = useChangeUserRole({
		onSuccess: () => {
			promoteDialog.close();
			demoteDialog.close();
		},
	});

	const displayName = user.name ?? user.email;
	const isPending = isDeletePending || isSuspendPending || isRestorePending || isChangeRolePending;

	return (
		<>
			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
			>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir supprimer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera désactivé mais
								les données seront conservées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 size-4 animate-spin" />
										Suppression…
									</>
								) : (
									<>
										<Trash2 className="mr-2 size-4" />
										Supprimer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={suspendDialog.isOpen}
				onOpenChange={(open) => (open ? suspendDialog.open() : suspendDialog.close())}
			>
				<AlertDialogContent>
					<form action={suspendAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Suspendre l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir suspendre{" "}
								<span className="font-semibold">{displayName}</span> ? L&apos;utilisateur ne pourra
								plus se connecter.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isSuspendPending ? (
									<>
										<LoaderCircle className="mr-2 size-4 animate-spin" />
										Suspension…
									</>
								) : (
									<>
										<CircleX className="mr-2 size-4" />
										Suspendre
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={restoreDialog.isOpen}
				onOpenChange={(open) => (open ? restoreDialog.open() : restoreDialog.close())}
			>
				<AlertDialogContent>
					<form action={restoreAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Restaurer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir restaurer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera réactivé.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isRestorePending ? (
									<>
										<LoaderCircle className="mr-2 size-4 animate-spin" />
										Restauration…
									</>
								) : (
									<>
										<RotateCcw className="mr-2 size-4" />
										Restaurer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={promoteDialog.isOpen}
				onOpenChange={(open) => (open ? promoteDialog.open() : promoteDialog.close())}
			>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="ADMIN" />
						<AlertDialogHeader>
							<AlertDialogTitle>Promouvoir en administrateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir promouvoir{" "}
								<span className="font-semibold">{displayName}</span> au rôle d&apos;administrateur ?
								Les administrateurs ont accès à toutes les fonctionnalités du dashboard.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isChangeRolePending ? (
									<>
										<LoaderCircle className="mr-2 size-4 animate-spin" />
										Promotion…
									</>
								) : (
									<>
										<CircleCheck className="mr-2 size-4" />
										Promouvoir
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={demoteDialog.isOpen}
				onOpenChange={(open) => (open ? demoteDialog.open() : demoteDialog.close())}
			>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="USER" />
						<AlertDialogHeader>
							<AlertDialogTitle>Rétrograder en utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir rétrograder{" "}
								<span className="font-semibold">{displayName}</span> au rôle d&apos;utilisateur
								standard ? Il perdra l&apos;accès au dashboard administrateur.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isChangeRolePending ? (
									<>
										<LoaderCircle className="mr-2 size-4 animate-spin" />
										Rétrogradation…
									</>
								) : (
									<>
										<CircleX className="mr-2 size-4" />
										Rétrograder
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
