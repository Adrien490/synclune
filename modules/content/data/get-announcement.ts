import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheAnnouncementsList } from "../constants/cache";
import type { AnnouncementListItem } from "../types/content.types";

/**
 * Get a single announcement by ID for admin detail/edit.
 */
export async function getAnnouncement(id: string): Promise<AnnouncementListItem | null> {
	return fetchAnnouncement(id);
}

async function fetchAnnouncement(id: string): Promise<AnnouncementListItem | null> {
	"use cache";
	cacheAnnouncementsList();

	try {
		const announcement = await prisma.announcementBar.findUnique({
			where: { id },
			select: {
				id: true,
				message: true,
				link: true,
				linkText: true,
				startsAt: true,
				endsAt: true,
				isActive: true,
				dismissDurationHours: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return announcement;
	} catch (err) {
		logger.error("Failed to fetch announcement", err, {
			service: "fetchAnnouncement",
		});
		return null;
	}
}
