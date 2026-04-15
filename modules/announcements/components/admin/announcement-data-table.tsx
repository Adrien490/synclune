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
			<div className="hidden flex-col items-center justify-center rounded-lg border border-dashed py-12 md:flex">
				<p className="text-muted-foreground text-sm">Aucune annonce pour le moment</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Créez votre première annonce pour l&apos;afficher sur la boutique.
				</p>
			</div>
		);
	}

	return (
		<div className="hidden rounded-md border md:block">
			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[35%]">Message</TableHead>
						<TableHead className="w-[15%]">Statut</TableHead>
						<TableHead className="w-[15%]">Début</TableHead>
						<TableHead className="w-[15%]">Fin</TableHead>
						<TableHead className="w-[8%]">
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
								<TableCell>
									<Badge
										variant="secondary"
										className={cn("text-xs", ANNOUNCEMENT_STATUS_COLORS[status])}
									>
										{ANNOUNCEMENT_STATUS_LABELS[status]}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{formatDateTime(announcement.startsAt)}
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
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
