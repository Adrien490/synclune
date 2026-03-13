"use client";

import { Edit, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { ANNOUNCEMENT_FORM_DIALOG_ID, DELETE_ANNOUNCEMENT_DIALOG_ID } from "../../constants/dialog";
import { useToggleAnnouncementStatus } from "../../hooks/use-toggle-announcement-status";
import type {
	AnnouncementDialogData,
	AnnouncementListItem,
	DeleteAnnouncementData,
} from "../../types/content.types";

interface AnnouncementRowActionsProps {
	announcement: AnnouncementListItem;
}

export function AnnouncementRowActions({ announcement }: AnnouncementRowActionsProps) {
	const { open: openDialog } = useDialog<AnnouncementDialogData>(ANNOUNCEMENT_FORM_DIALOG_ID);
	const { open: openAlert } = useAlertDialog<DeleteAnnouncementData>(DELETE_ANNOUNCEMENT_DIALOG_ID);
	const { toggleStatus, isPending: isToggling } = useToggleAnnouncementStatus();

	const handleEdit = () => {
		openDialog({ announcement });
	};

	const handleDelete = () => {
		openAlert({
			announcementId: announcement.id,
			announcementMessage: announcement.message,
		});
	};

	const handleToggle = () => {
		toggleStatus(announcement.id, !announcement.isActive);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour l'annonce`}
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleEdit}>
					<Edit className="h-4 w-4" />
					Éditer
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleToggle} disabled={isToggling}>
					{announcement.isActive ? (
						<>
							<PowerOff className="h-4 w-4" />
							Désactiver
						</>
					) : (
						<>
							<Power className="h-4 w-4" />
							Activer
						</>
					)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-destructive">
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
