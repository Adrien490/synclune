"use client";

import {
	CircleX,
	Download,
	Eye,
	KeyRound,
	LogOut,
	RotateCcw,
	Shield,
	Trash2,
	UserMinus,
} from "lucide-react";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useExportUserDataAdmin } from "./use-export-user-data-admin";
import { useInvalidateUserSessions } from "./use-invalidate-user-sessions";
import { useSendPasswordResetAdmin } from "./use-send-password-reset-admin";

interface UseUserActionsParams {
	user: {
		id: string;
		name: string | null;
		email: string;
		role?: string;
		deletedAt: Date | null;
		suspendedAt?: Date | null;
	};
}

export function useUserActions({ user }: UseUserActionsParams): {
	sections: ActionMenuSection[];
} {
	const deleteDialog = useDialog(`delete-user-${user.id}`);
	const suspendDialog = useDialog(`suspend-user-${user.id}`);
	const restoreDialog = useDialog(`restore-user-${user.id}`);
	const promoteDialog = useDialog(`promote-user-${user.id}`);
	const demoteDialog = useDialog(`demote-user-${user.id}`);

	const { exportData, isPending: isExportPending } = useExportUserDataAdmin();
	const { invalidate: invalidateSessions, isPending: isInvalidatePending } =
		useInvalidateUserSessions();
	const { sendReset, isPending: isResetPending } = useSendPasswordResetAdmin();

	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;
	const isAdmin = user.role === "ADMIN";
	const displayName = user.name ?? user.email;

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "detail",
					label: "Voir le détail",
					icon: Eye,
					href: `/admin/clients/${user.id}`,
				},
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
					closesMenu: false,
					onSelect: () => promoteDialog.open(),
				},
				{
					key: "demote",
					label: "Rétrograder utilisateur",
					icon: UserMinus,
					disabled: !isAdmin,
					hidden: isDeleted,
					closesMenu: false,
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
					closesMenu: false,
					onSelect: () => suspendDialog.open(),
				},
				{
					key: "unsuspend",
					label: "Lever la suspension",
					icon: RotateCcw,
					hidden: isDeleted || !isSuspended,
					closesMenu: false,
					onSelect: () => restoreDialog.open(),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: RotateCcw,
					hidden: !isDeleted,
					closesMenu: false,
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
					closesMenu: false,
					onSelect: () => deleteDialog.open(),
				},
			],
		},
	];

	return { sections };
}
