"use client";

import { ExternalLink, Power, PowerOff, SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/dates";

import {
	ANNOUNCEMENT_FORM_DIALOG_ID,
	ANNOUNCEMENT_ITEM_DRAWER_ID,
	DELETE_ANNOUNCEMENT_DIALOG_ID,
} from "../../constants/dialog";
import { useToggleAnnouncementStatus } from "../../hooks/use-toggle-announcement-status";
import { computeAnnouncementStatus } from "../../services/announcement-schedule.service";
import type {
	AnnouncementDialogData,
	AnnouncementListItem,
	DeleteAnnouncementData,
} from "../../types/announcement.types";
import {
	ANNOUNCEMENT_STATUS_COLORS,
	ANNOUNCEMENT_STATUS_LABELS,
} from "../../utils/announcement-status";

export interface AnnouncementItemDrawerData {
	announcement: AnnouncementListItem;
	[key: string]: unknown;
}

export function AnnouncementItemDrawer() {
	const drawer = useDialog<AnnouncementItemDrawerData>(ANNOUNCEMENT_ITEM_DRAWER_ID);
	const formDialog = useDialog<AnnouncementDialogData>(ANNOUNCEMENT_FORM_DIALOG_ID);
	const deleteAlert = useAlertDialog<DeleteAnnouncementData>(DELETE_ANNOUNCEMENT_DIALOG_ID);
	const { toggleStatus, isPending: isToggling } = useToggleAnnouncementStatus();

	const announcement = drawer.data?.announcement;

	if (!announcement) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const status = computeAnnouncementStatus(announcement);
	const statusLabel = ANNOUNCEMENT_STATUS_LABELS[status];

	const handleEdit = () => {
		drawer.close();
		formDialog.open({ announcement });
	};

	const handleToggle = () => {
		toggleStatus(announcement.id, !announcement.isActive);
		drawer.close();
	};

	const handleDelete = () => {
		drawer.close();
		deleteAlert.open({
			announcementId: announcement.id,
			announcementMessage: announcement.message,
		});
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title="Annonce"
			description={statusLabel}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Message</dt>
				<dd className="text-pretty">{announcement.message}</dd>
				{announcement.link ? (
					<>
						<dt className="text-muted-foreground">Lien</dt>
						<dd className="truncate">
							<a
								href={announcement.link}
								target="_blank"
								rel="noopener noreferrer"
								className="underline-offset-4 hover:underline"
							>
								{announcement.linkText || announcement.link}
							</a>
						</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Début</dt>
				<dd>{formatDateTime(announcement.startsAt)}</dd>
				{announcement.endsAt ? (
					<>
						<dt className="text-muted-foreground">Fin</dt>
						<dd>{formatDateTime(announcement.endsAt)}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant="secondary" className={cn(ANNOUNCEMENT_STATUS_COLORS[status])}>
						{statusLabel}
					</Badge>
				</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
				>
					<SquarePen className="size-4" aria-hidden="true" />
					Éditer
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleToggle}
					disabled={isToggling}
				>
					{announcement.isActive ? (
						<>
							<PowerOff className="size-4" aria-hidden="true" />
							Désactiver
						</>
					) : (
						<>
							<Power className="size-4" aria-hidden="true" />
							Activer
						</>
					)}
				</Button>
				{announcement.link ? (
					<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
						<Link
							href={announcement.link}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => drawer.close()}
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Ouvrir le lien
						</Link>
					</Button>
				) : null}
				<Button
					variant="outline"
					size="lg"
					className="text-destructive hover:text-destructive h-12 justify-start gap-3"
					onClick={handleDelete}
				>
					<Trash2 className="size-4" aria-hidden="true" />
					Supprimer
				</Button>
			</div>
		</AdminItemDrawer>
	);
}
