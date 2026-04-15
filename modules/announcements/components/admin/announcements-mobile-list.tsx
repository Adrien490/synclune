"use client";

import { use } from "react";
import { Megaphone } from "lucide-react";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { formatDateTime } from "@/shared/utils/dates";
import { cn } from "@/shared/utils/cn";
import { computeAnnouncementStatus } from "../../services/announcement-schedule.service";
import {
	ANNOUNCEMENT_STATUS_LABELS,
	ANNOUNCEMENT_STATUS_COLORS,
} from "../../utils/announcement-status";
import type { AnnouncementListItem } from "../../types/announcement.types";
import { AnnouncementRowActions } from "./announcement-row-actions";

interface AnnouncementsMobileListProps {
	announcementsPromise: Promise<AnnouncementListItem[]>;
}

export function AnnouncementsMobileList({ announcementsPromise }: AnnouncementsMobileListProps) {
	const announcements = use(announcementsPromise);

	if (announcements.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Megaphone}
					title="Aucune annonce"
					description="Aucune annonce pour le moment. Creez votre premiere annonce pour l'afficher sur la boutique."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 md:hidden">
			<ItemGroup aria-label="Annonces" className="gap-2">
				{announcements.map((announcement) => {
					const status = computeAnnouncementStatus(announcement);

					return (
						<div key={announcement.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte annonce"
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<span className="truncate">{announcement.message}</span>
										<Badge
											variant="secondary"
											className={cn("shrink-0 text-xs", ANNOUNCEMENT_STATUS_COLORS[status])}
										>
											{ANNOUNCEMENT_STATUS_LABELS[status]}
										</Badge>
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>{formatDateTime(announcement.startsAt)}</span>
										{announcement.endsAt && (
											<>
												<span aria-hidden="true">→</span>
												<span>{formatDateTime(announcement.endsAt)}</span>
											</>
										)}
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<AnnouncementRowActions announcement={announcement} />
								</ItemActions>
							</Item>
						</div>
					);
				})}
			</ItemGroup>
		</div>
	);
}
