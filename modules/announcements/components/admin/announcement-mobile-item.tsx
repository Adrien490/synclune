"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/dates";

import { ANNOUNCEMENT_ITEM_DRAWER_ID } from "../../constants/dialog";
import { computeAnnouncementStatus } from "../../services/announcement-schedule.service";
import type { AnnouncementListItem } from "../../types/announcement.types";
import {
	ANNOUNCEMENT_STATUS_COLORS,
	ANNOUNCEMENT_STATUS_LABELS,
} from "../../utils/announcement-status";

import type { AnnouncementItemDrawerData } from "./announcement-item-drawer";

interface AnnouncementMobileItemProps {
	announcement: AnnouncementListItem;
}

export function AnnouncementMobileItem({ announcement }: AnnouncementMobileItemProps) {
	const { open } = useDialog<AnnouncementItemDrawerData>(ANNOUNCEMENT_ITEM_DRAWER_ID);
	const status = computeAnnouncementStatus(announcement);

	return (
		<button
			type="button"
			onClick={() => open({ announcement })}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label="Ouvrir la fiche de l'annonce"
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
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
						{announcement.endsAt ? (
							<>
								<span aria-hidden="true">→</span>
								<span>{formatDateTime(announcement.endsAt)}</span>
							</>
						) : null}
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
