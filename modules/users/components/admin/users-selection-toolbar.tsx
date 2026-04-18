"use client";

import {
	CircleCheck,
	CircleX,
	EllipsisVertical,
	LoaderCircle,
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
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
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
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useBulkChangeUserRole } from "@/modules/users/hooks/use-bulk-change-user-role";
import { useBulkDeleteUsers } from "@/modules/users/hooks/use-bulk-delete-users";
import { useBulkRestoreUsers } from "@/modules/users/hooks/use-bulk-restore-users";
import { useBulkSuspendUsers } from "@/modules/users/hooks/use-bulk-suspend-users";

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

	const sections: ActionMenuSection[] = [
		{
			key: "role",
			label: "Rôle",
			items: [
				{
					key: "promote",
					label: "Promouvoir admin",
					icon: Shield,
					onSelect: () => promoteDialog.open(),
				},
				{
					key: "demote",
					label: "Rétrograder utilisateur",
					icon: UserMinus,
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
					onSelect: () => suspendDialog.open(),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: RotateCcw,
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
					onSelect: () => deleteDialog.open(),
				},
			],
		},
	];

	const label = `${selectedItems.length} utilisateur${selectedItems.length > 1 ? "s" : ""} sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<>
			<SelectionToolbar>
				<span className="text-muted-foreground text-sm">{label}</span>
				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-11 w-11 p-0"
							aria-label="Actions de la sélection"
						>
							<span className="sr-only">Ouvrir le menu</span>
							<EllipsisVertical className="h-4 w-4" />
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions groupées"
						description={label}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</SelectionToolbar>

			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
			>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les comptes seront désactivés mais les données seront conservées.
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
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Suspendre les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir suspendre{" "}
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
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Restaurer les utilisateurs</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir restaurer{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les comptes supprimés ou suspendus seront réactivés.
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
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<input type="hidden" name="role" value="ADMIN" />
						<AlertDialogHeader>
							<AlertDialogTitle>Promouvoir en administrateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir promouvoir{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								au rôle d&apos;administrateur ?
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
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<input type="hidden" name="role" value="USER" />
						<AlertDialogHeader>
							<AlertDialogTitle>Rétrograder en utilisateur</AlertDialogTitle>
							<AlertDialogDescription>
								Êtes-vous sûr de vouloir rétrograder{" "}
								<span className="font-semibold">
									{selectedItems.length} utilisateur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								au rôle d&apos;utilisateur standard ?
								<br />
								<br />
								Ils perdront l&apos;accès au dashboard administrateur.
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
