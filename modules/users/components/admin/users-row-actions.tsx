"use client";

import {
	CircleCheck,
	CircleX,
	Download,
	EllipsisVertical,
	Eye,
	KeyRound,
	LoaderCircle,
	LogOut,
	RotateCcw,
	Shield,
	Trash2,
	UserMinus,
} from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
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
import { useExportUserDataAdmin } from "@/modules/users/hooks/use-export-user-data-admin";
import { useInvalidateUserSessions } from "@/modules/users/hooks/use-invalidate-user-sessions";
import { useRestoreUser } from "@/modules/users/hooks/use-restore-user";
import { useSendPasswordResetAdmin } from "@/modules/users/hooks/use-send-password-reset-admin";
import { useSuspendUser } from "@/modules/users/hooks/use-suspend-user";

interface UsersRowActionsProps {
	user: {
		id: string;
		name: string;
		email: string;
		role?: string;
		deletedAt: Date | null;
		suspendedAt?: Date | null;
	};
}

export function UsersRowActions({ user }: UsersRowActionsProps) {
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

	const { exportData, isPending: isExportPending } = useExportUserDataAdmin();
	const { invalidate: invalidateSessions, isPending: isInvalidatePending } =
		useInvalidateUserSessions();
	const { sendReset, isPending: isResetPending } = useSendPasswordResetAdmin();

	const isPending =
		isDeletePending ||
		isSuspendPending ||
		isRestorePending ||
		isChangeRolePending ||
		isExportPending ||
		isInvalidatePending ||
		isResetPending;

	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;
	const isAdmin = user.role === "ADMIN";
	const displayName = user.name || user.email;

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "orders",
					label: "Voir commandes",
					icon: Eye,
					href: `/admin/ventes/commandes?userId=${user.id}`,
				},
			],
		},
		{
			key: "account",
			label: "Compte",
			items: [
				{
					key: "export",
					label: "Exporter données (RGPD)",
					icon: Download,
					disabled: isExportPending,
					onSelect: () => exportData(user.id, displayName),
				},
				{
					key: "logout",
					label: "Forcer la déconnexion",
					icon: LogOut,
					disabled: isInvalidatePending,
					onSelect: () => invalidateSessions(user.id, displayName),
				},
				{
					key: "reset",
					label: "Envoyer reset mot de passe",
					icon: KeyRound,
					disabled: isResetPending,
					onSelect: () => sendReset(user.id, displayName),
				},
			],
		},
		{
			key: "role",
			label: "Rôle",
			items: [
				{
					key: "promote",
					label: "Promouvoir admin",
					icon: Shield,
					disabled: isAdmin,
					hidden: isDeleted,
					onSelect: () => promoteDialog.open(),
				},
				{
					key: "demote",
					label: "Rétrograder utilisateur",
					icon: UserMinus,
					disabled: !isAdmin,
					hidden: isDeleted,
					onSelect: () => demoteDialog.open(),
				},
			],
		},
		{
			key: "status",
			items: [
				{
					key: "suspend",
					label: "Suspendre",
					icon: CircleX,
					hidden: isDeleted || isSuspended,
					onSelect: () => suspendDialog.open(),
				},
				{
					key: "unsuspend",
					label: "Lever la suspension",
					icon: RotateCcw,
					hidden: isDeleted || !isSuspended,
					onSelect: () => restoreDialog.open(),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: RotateCcw,
					hidden: !isDeleted,
					onSelect: () => restoreDialog.open(),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					hidden: isDeleted,
					onSelect: () => deleteDialog.open(),
				},
			],
		},
	];

	return (
		<>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions utilisateur"
					description={displayName}
					sections={sections}
				/>
			</ResponsiveActionMenu>

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
								<span className="font-semibold">{displayName}</span> ?
								<br />
								<br />
								Le compte sera désactivé mais les données seront conservées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
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
								<span className="font-semibold">{displayName}</span> ?
								<br />
								<br />
								L&apos;utilisateur ne pourra plus se connecter.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isSuspendPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Suspension...
									</>
								) : (
									<>
										<CircleX className="mr-2 h-4 w-4" />
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
								<span className="font-semibold">{displayName}</span> ?
								<br />
								<br />
								Le compte sera réactivé.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isRestorePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
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
								<br />
								<br />
								<span className="font-medium text-amber-600">
									Les administrateurs ont accès à toutes les fonctionnalités du dashboard.
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
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Promotion...
									</>
								) : (
									<>
										<CircleCheck className="mr-2 h-4 w-4" />
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
								standard ?
								<br />
								<br />
								Il perdra l&apos;accès au dashboard administrateur.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isChangeRolePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Rétrogradation...
									</>
								) : (
									<>
										<CircleX className="mr-2 h-4 w-4" />
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
