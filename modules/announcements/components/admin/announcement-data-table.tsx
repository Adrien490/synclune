"use client";

import { use } from "react";

import { Badge } from "@/shared/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatDateTime } from "@/shared/utils/dates";
import { cn } from "@/shared/utils/cn";

import { computeAnnouncementStatus } from "../../services/announcement-schedule.service";
import type { AnnouncementListItem } from "../../types/announcement.types";
import {
	ANNOUNCEMENT_STATUS_LABELS,
	ANNOUNCEMENT_STATUS_COLORS,
} from "../../utils/announcement-status";
import { AnnouncementRowActions } from "./announcement-row-actions";

interface AnnouncementDataTableProps {
	announcementsPromise: Promise<AnnouncementListItem[]>;
}

export function AnnouncementDataTable({ announcementsPromise }: AnnouncementDataTableProps) {
	const announcements = use(announcementsPromise);

	if (announcements.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
				<p className="text-muted-foreground text-sm">Aucune annonce pour le moment</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Créez votre première annonce pour l&apos;afficher sur la boutique.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Message</TableHead>
						<TableHead className="hidden md:table-cell">Statut</TableHead>
						<TableHead className="hidden lg:table-cell">Début</TableHead>
						<TableHead className="hidden lg:table-cell">Fin</TableHead>
						<TableHead className="w-12">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{announcements.map((announcement) => {
						const status = computeAnnouncementStatus(announcement);
						return (
							<TableRow key={announcement.id}>
								<TableCell>
									<div className="max-w-xs truncate font-medium">{announcement.message}</div>
									{announcement.linkText && (
										<div className="text-muted-foreground mt-0.5 text-xs">
											Lien : {announcement.linkText}
										</div>
									)}
								</TableCell>
								<TableCell className="hidden md:table-cell">
									<Badge
										variant="secondary"
										className={cn("text-xs", ANNOUNCEMENT_STATUS_COLORS[status])}
									>
										{ANNOUNCEMENT_STATUS_LABELS[status]}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
									{formatDateTime(announcement.startsAt)}
								</TableCell>
								<TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
									{announcement.endsAt ? formatDateTime(announcement.endsAt) : "—"}
								</TableCell>
								<TableCell>
									<AnnouncementRowActions announcement={announcement} />
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
