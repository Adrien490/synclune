"use client";

import { EllipsisVertical, Power, PowerOff, SquarePen, Trash2 } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { ANNOUNCEMENT_FORM_DIALOG_ID, DELETE_ANNOUNCEMENT_DIALOG_ID } from "../../constants/dialog";
import { useToggleAnnouncementStatus } from "../../hooks/use-toggle-announcement-status";
import type {
	AnnouncementDialogData,
	AnnouncementListItem,
	DeleteAnnouncementData,
} from "../../types/announcement.types";

interface AnnouncementRowActionsProps {
	announcement: AnnouncementListItem;
}

export function AnnouncementRowActions({ announcement }: AnnouncementRowActionsProps) {
	const { open: openDialog } = useDialog<AnnouncementDialogData>(ANNOUNCEMENT_FORM_DIALOG_ID);
	const { open: openAlert } = useAlertDialog<DeleteAnnouncementData>(DELETE_ANNOUNCEMENT_DIALOG_ID);
	const { toggleStatus, isPending: isToggling } = useToggleAnnouncementStatus();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: SquarePen,
					haptic: "selection",
					onSelect: () => openDialog({ announcement }),
				},
				{
					key: "toggle",
					label: announcement.isActive ? "Désactiver" : "Activer",
					icon: announcement.isActive ? PowerOff : Power,
					disabled: isToggling,
					haptic: "medium",
					onSelect: () => toggleStatus(announcement.id, !announcement.isActive),
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
					onSelect: () =>
						openAlert({
							announcementId: announcement.id,
							announcementMessage: announcement.message,
						}),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label="Actions pour l'annonce"
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" sections={sections} />
		</ResponsiveActionMenu>
	);
}
