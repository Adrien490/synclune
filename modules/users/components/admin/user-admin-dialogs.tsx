"use client";

import { LoaderCircle } from "lucide-react";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
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
			<ResponsiveAlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
				tone="destructive"
			>
				<ResponsiveAlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="id" value={user.id} />
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Supprimer l&apos;utilisateur</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Êtes-vous sûr de vouloir supprimer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera désactivé mais
								les données seront conservées.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel disabled={isPending}>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isDeletePending}
							>
								{isDeletePending && <LoaderCircle className="motion-safe:animate-spin" />}
								{isDeletePending ? "Suppression…" : "Supprimer"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			<ResponsiveAlertDialog
				open={suspendDialog.isOpen}
				onOpenChange={(open) => (open ? suspendDialog.open() : suspendDialog.close())}
				tone="warning"
			>
				<ResponsiveAlertDialogContent>
					<form action={suspendAction}>
						<input type="hidden" name="id" value={user.id} />
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Suspendre l&apos;utilisateur</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Êtes-vous sûr de vouloir suspendre{" "}
								<span className="font-semibold">{displayName}</span> ? L&apos;utilisateur ne pourra
								plus se connecter.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel disabled={isPending}>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isSuspendPending}
							>
								{isSuspendPending && <LoaderCircle className="motion-safe:animate-spin" />}
								{isSuspendPending ? "Suspension…" : "Suspendre"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			<ResponsiveAlertDialog
				open={restoreDialog.isOpen}
				onOpenChange={(open) => (open ? restoreDialog.open() : restoreDialog.close())}
				tone="success"
			>
				<ResponsiveAlertDialogContent>
					<form action={restoreAction}>
						<input type="hidden" name="id" value={user.id} />
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Restaurer l&apos;utilisateur</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Êtes-vous sûr de vouloir restaurer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera réactivé.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel disabled={isPending}>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isRestorePending}
							>
								{isRestorePending && <LoaderCircle className="motion-safe:animate-spin" />}
								{isRestorePending ? "Restauration…" : "Restaurer"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			<ResponsiveAlertDialog
				open={promoteDialog.isOpen}
				onOpenChange={(open) => (open ? promoteDialog.open() : promoteDialog.close())}
				tone="info"
			>
				<ResponsiveAlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="ADMIN" />
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Promouvoir en administrateur</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Êtes-vous sûr de vouloir promouvoir{" "}
								<span className="font-semibold">{displayName}</span> au rôle d&apos;administrateur ?
								Les administrateurs ont accès à toutes les fonctionnalités du dashboard.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel disabled={isPending}>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isChangeRolePending}
							>
								{isChangeRolePending && <LoaderCircle className="motion-safe:animate-spin" />}
								{isChangeRolePending ? "Promotion…" : "Promouvoir"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			<ResponsiveAlertDialog
				open={demoteDialog.isOpen}
				onOpenChange={(open) => (open ? demoteDialog.open() : demoteDialog.close())}
				tone="warning"
			>
				<ResponsiveAlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="USER" />
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Rétrograder en utilisateur</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Êtes-vous sûr de vouloir rétrograder{" "}
								<span className="font-semibold">{displayName}</span> au rôle d&apos;utilisateur
								standard ? Il perdra l&apos;accès au dashboard administrateur.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel disabled={isPending}>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isChangeRolePending}
							>
								{isChangeRolePending && <LoaderCircle className="motion-safe:animate-spin" />}
								{isChangeRolePending ? "Rétrogradation…" : "Rétrograder"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</>
	);
}
