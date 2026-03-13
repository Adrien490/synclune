import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheAnnouncementsList } from "../constants/cache";
import type { AnnouncementListItem } from "../types/content.types";

/**
 * Get all announcements for admin list, ordered by creation date (newest first).
 */
export async function getAnnouncements(): Promise<AnnouncementListItem[]> {
	return fetchAnnouncements();
}

async function fetchAnnouncements(): Promise<AnnouncementListItem[]> {
	"use cache";
	cacheAnnouncementsList();

	try {
		const announcements = await prisma.announcementBar.findMany({
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
			orderBy: { createdAt: "desc" },
		});

		return announcements;
	} catch (err) {
		logger.error("Failed to fetch announcements", err, {
			service: "fetchAnnouncements",
		});
		return [];
	}
}
