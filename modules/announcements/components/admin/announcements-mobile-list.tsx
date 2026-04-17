"use client";

import { use } from "react";
import { Megaphone } from "lucide-react";

import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { AnnouncementListItem } from "../../types/announcement.types";
import { AnnouncementMobileItem } from "./announcement-mobile-item";

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
				{announcements.map((announcement) => (
					<div key={announcement.id} role="listitem">
						<AnnouncementMobileItem announcement={announcement} />
					</div>
				))}
			</ItemGroup>
		</div>
	);
}
