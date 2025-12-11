"use client";

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
import {
	CheckCircle2,
	Download,
	Eye,
	KeyRound,
	Loader2,
	LogOut,
	MoreVertical,
	RotateCcw,
	Trash2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDeleteUser } from "@/modules/users/hooks/use-delete-user";
import { useSuspendUser } from "@/modules/users/hooks/use-suspend-user";
import { useRestoreUser } from "@/modules/users/hooks/use-restore-user";
import { useChangeUserRole } from "@/modules/users/hooks/use-change-user-role";
import { useExportUserDataAdmin } from "@/modules/users/hooks/use-export-user-data-admin";
import { useInvalidateUserSessions } from "@/modules/users/hooks/use-invalidate-user-sessions";
import { useSendPasswordResetAdmin } from "@/modules/users/hooks/use-send-password-reset-admin";

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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
	const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
	const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
	const [demoteDialogOpen, setDemoteDialogOpen] = useState(false);

	const { action: deleteAction, isPending: isDeletePending } = useDeleteUser({
		onSuccess: () => setDeleteDialogOpen(false),
	});

	const { action: suspendAction, isPending: isSuspendPending } = useSuspendUser({
		onSuccess: () => setSuspendDialogOpen(false),
	});

	const { action: restoreAction, isPending: isRestorePending } = useRestoreUser({
		onSuccess: () => setRestoreDialogOpen(false),
	});

	const { action: changeRoleAction, isPending: isChangeRolePending } = useChangeUserRole({
		onSuccess: () => {
			setPromoteDialogOpen(false);
			setDemoteDialogOpen(false);
		},
	});

	const { exportData, isPending: isExportPending } = useExportUserDataAdmin();
	const { invalidate: invalidateSessions, isPending: isInvalidatePending } = useInvalidateUserSessions();
	const { sendReset, isPending: isResetPending } = useSendPasswordResetAdmin();

	const isPending = isDeletePending || isSuspendPending || isRestorePending || isChangeRolePending || isExportPending || isInvalidatePending || isResetPending;
	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;
	const isAdmin = user.role === "ADMIN";
	const displayName = user.name || user.email;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* Navigation vers les données utilisateur */}
					<DropdownMenuItem asChild>
						<Link
							href={`/admin/ventes/commandes?userId=${user.id}`}
							className="flex items-center cursor-pointer"
						>
							<Eye className="mr-2 h-4 w-4" />
							Voir commandes
						</Link>
					</DropdownMenuItem>
	
					<DropdownMenuSeparator />

					{/* Export RGPD */}
					<DropdownMenuItem
						onClick={() => exportData(user.id, displayName)}
						disabled={isExportPending}
						className="flex items-center cursor-pointer"
					>
						<Download className="mr-2 h-4 w-4" />
						Exporter données (RGPD)
					</DropdownMenuItem>

					{/* Forcer déconnexion */}
					<DropdownMenuItem
						onClick={() => invalidateSessions(user.id, displayName)}
						disabled={isInvalidatePending}
						className="flex items-center cursor-pointer"
					>
						<LogOut className="mr-2 h-4 w-4" />
						Forcer la déconnexion
					</DropdownMenuItem>

					{/* Reset mot de passe */}
					<DropdownMenuItem
						onClick={() => sendReset(user.id, displayName)}
						disabled={isResetPending}
						className="flex items-center cursor-pointer"
					>
						<KeyRound className="mr-2 h-4 w-4" />
						Envoyer reset mot de passe
					</DropdownMenuItem>

					{!isDeleted && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									Changer le role
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										onClick={() => setPromoteDialogOpen(true)}
										disabled={isAdmin}
									>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Promouvoir admin
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setDemoteDialogOpen(true)}
										disabled={!isAdmin}
									>
										<XCircle className="mr-2 h-4 w-4" />
										Retrograder utilisateur
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuSeparator />
							{!isSuspended ? (
								<DropdownMenuItem
									className="flex items-center cursor-pointer"
									onClick={() => setSuspendDialogOpen(true)}
								>
									<XCircle className="mr-2 h-4 w-4" />
									Suspendre
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									className="flex items-center cursor-pointer"
									onClick={() => setRestoreDialogOpen(true)}
								>
									<RotateCcw className="mr-2 h-4 w-4" />
									Lever la suspension
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								className="flex items-center cursor-pointer text-destructive focus:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Supprimer
							</DropdownMenuItem>
						</>
					)}
					{isDeleted && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="flex items-center cursor-pointer"
								onClick={() => setRestoreDialogOpen(true)}
							>
								<RotateCcw className="mr-2 h-4 w-4" />
								Restaurer
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Delete Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir supprimer{" "}
								<span className="font-semibold">{displayName}</span> ?
								<br />
								<br />
								Le compte sera desactive mais les donnees seront conservees.
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
			<AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
				<AlertDialogContent>
					<form action={suspendAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Suspendre l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir suspendre{" "}
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
			<AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
				<AlertDialogContent>
					<form action={restoreAction}>
						<input type="hidden" name="id" value={user.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Restaurer l&apos;utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir restaurer{" "}
								<span className="font-semibold">{displayName}</span> ?
								<br />
								<br />
								Le compte sera reactive.
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
			<AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="ADMIN" />
						<AlertDialogHeader>
							<AlertDialogTitle>Promouvoir en administrateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir promouvoir{" "}
								<span className="font-semibold">{displayName}</span> au role
								d&apos;administrateur ?
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
			<AlertDialog open={demoteDialogOpen} onOpenChange={setDemoteDialogOpen}>
				<AlertDialogContent>
					<form action={changeRoleAction}>
						<input type="hidden" name="id" value={user.id} />
						<input type="hidden" name="role" value="USER" />
						<AlertDialogHeader>
							<AlertDialogTitle>Retrograder en utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Etes-vous sur de vouloir retrograder{" "}
								<span className="font-semibold">{displayName}</span> au role
								d&apos;utilisateur standard ?
								<br />
								<br />
								Il perdra l&apos;acces au dashboard administrateur.
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
