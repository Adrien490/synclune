"use client";

import { useState } from "react";
import {
	CircleCheck,
	CircleX,
	Download,
	Eye,
	KeyRound,
	LoaderCircle,
	LogOut,
	RotateCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import { useChangeUserRole } from "@/modules/users/hooks/use-change-user-role";
import { useDeleteUser } from "@/modules/users/hooks/use-delete-user";
import { useExportUserDataAdmin } from "@/modules/users/hooks/use-export-user-data-admin";
import { useInvalidateUserSessions } from "@/modules/users/hooks/use-invalidate-user-sessions";
import { useRestoreUser } from "@/modules/users/hooks/use-restore-user";
import { useSendPasswordResetAdmin } from "@/modules/users/hooks/use-send-password-reset-admin";
import { useSuspendUser } from "@/modules/users/hooks/use-suspend-user";

export const USER_ITEM_DRAWER_ID = "user-item-drawer";

export interface UserItemDrawerData {
	user: {
		id: string;
		name: string;
		email: string;
		role?: string;
		emailVerified?: boolean;
		deletedAt: Date | null;
		suspendedAt: Date | null;
		orderCount: number;
		createdAt: Date;
	};
	[key: string]: unknown;
}

type AlertKind = "delete" | "suspend" | "restore" | "promote" | "demote" | null;

export function UserItemDrawer() {
	const drawer = useDialog<UserItemDrawerData>(USER_ITEM_DRAWER_ID);
	const [alertKind, setAlertKind] = useState<AlertKind>(null);

	const { action: deleteAction, isPending: isDeletePending } = useDeleteUser({
		onSuccess: () => setAlertKind(null),
	});
	const { action: suspendAction, isPending: isSuspendPending } = useSuspendUser({
		onSuccess: () => setAlertKind(null),
	});
	const { action: restoreAction, isPending: isRestorePending } = useRestoreUser({
		onSuccess: () => setAlertKind(null),
	});
	const { action: changeRoleAction, isPending: isChangeRolePending } = useChangeUserRole({
		onSuccess: () => setAlertKind(null),
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

	const user = drawer.data?.user;

	if (!user) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const displayName = user.name || user.email;
	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;
	const isAdmin = user.role === "ADMIN";

	const openAlert = (kind: Exclude<AlertKind, null>) => () => {
		drawer.close();
		setAlertKind(kind);
	};

	return (
		<>
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title={displayName}
				description={user.email}
			>
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Email</dt>
					<dd className="flex items-center gap-1.5 truncate">
						<span className="truncate">{user.email}</span>
						{user.emailVerified ? (
							<CircleCheck className="size-4 shrink-0 text-green-600" aria-label="Email vérifié" />
						) : null}
					</dd>
					<dt className="text-muted-foreground">Rôle</dt>
					<dd>
						<Badge variant={isAdmin ? "default" : "secondary"}>
							{isAdmin ? "Administrateur" : "Utilisateur"}
						</Badge>
					</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd className="flex flex-wrap gap-1.5">
						{isDeleted ? (
							<Badge variant="outline">Supprimé</Badge>
						) : isSuspended ? (
							<Badge variant="outline">Suspendu</Badge>
						) : (
							<Badge variant="default">Actif</Badge>
						)}
					</dd>
					<dt className="text-muted-foreground">Commandes</dt>
					<dd>{user.orderCount}</dd>
					<dt className="text-muted-foreground">Inscription</dt>
					<dd>{formatDateShort(user.createdAt)}</dd>
				</dl>

				<div role="group" aria-label="Actions" className="flex flex-col gap-2">
					<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
						<Link href={`/admin/ventes/commandes?userId=${user.id}`} onClick={() => drawer.close()}>
							<Eye className="size-4" aria-hidden="true" />
							Voir commandes
						</Link>
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => exportData(user.id, displayName)}
						disabled={isExportPending}
					>
						<Download className="size-4" aria-hidden="true" />
						Exporter données (RGPD)
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => invalidateSessions(user.id, displayName)}
						disabled={isInvalidatePending}
					>
						<LogOut className="size-4" aria-hidden="true" />
						Forcer la déconnexion
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => sendReset(user.id, displayName)}
						disabled={isResetPending}
					>
						<KeyRound className="size-4" aria-hidden="true" />
						Envoyer reset mot de passe
					</Button>
					{!isDeleted ? (
						<>
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={openAlert(isAdmin ? "demote" : "promote")}
							>
								{isAdmin ? (
									<>
										<CircleX className="size-4" aria-hidden="true" />
										Rétrograder utilisateur
									</>
								) : (
									<>
										<CircleCheck className="size-4" aria-hidden="true" />
										Promouvoir admin
									</>
								)}
							</Button>
							{isSuspended ? (
								<Button
									variant="outline"
									size="lg"
									className="h-12 justify-start gap-3"
									onClick={openAlert("restore")}
								>
									<RotateCcw className="size-4" aria-hidden="true" />
									Lever la suspension
								</Button>
							) : (
								<Button
									variant="outline"
									size="lg"
									className="h-12 justify-start gap-3"
									onClick={openAlert("suspend")}
								>
									<CircleX className="size-4" aria-hidden="true" />
									Suspendre
								</Button>
							)}
							<Button
								variant="outline"
								size="lg"
								className="text-destructive hover:text-destructive h-12 justify-start gap-3"
								onClick={openAlert("delete")}
							>
								<Trash2 className="size-4" aria-hidden="true" />
								Supprimer
							</Button>
						</>
					) : (
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={openAlert("restore")}
						>
							<RotateCcw className="size-4" aria-hidden="true" />
							Restaurer
						</Button>
					)}
				</div>
			</AdminItemDrawer>

			<AlertDialog
				open={alertKind === "delete"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir supprimer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera desactive mais
								les donnees seront conservees.
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
				open={alertKind === "suspend"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={suspendAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Suspendre l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir suspendre{" "}
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
				open={alertKind === "restore"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={restoreAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Restaurer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir restaurer{" "}
								<span className="font-semibold">{displayName}</span> ? Le compte sera reactive.
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
				open={alertKind === "promote"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="ADMIN" />
						<AlertDialogHeader>
							<AlertDialogTitle>Promouvoir en administrateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir promouvoir{" "}
								<span className="font-semibold">{displayName}</span> au role d&apos;administrateur ?
								Les administrateurs ont acces a toutes les fonctionnalites du dashboard.
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
				open={alertKind === "demote"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="USER" />
						<AlertDialogHeader>
							<AlertDialogTitle>Retrograder en utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir retrograder{" "}
								<span className="font-semibold">{displayName}</span> au role d&apos;utilisateur
								standard ? Il perdra l&apos;acces au dashboard administrateur.
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
										Retrogradation...
									</>
								) : (
									<>
										<CircleX className="mr-2 h-4 w-4" />
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
