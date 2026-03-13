import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { cacheActiveAnnouncement } from "../constants/cache";
import type { ActiveAnnouncement } from "../types/announcement.types";

/**
 * Get the currently active announcement for storefront display.
 *
 * Returns the single active announcement that is within its scheduled window,
 * or null if none is currently displayable.
 */
export async function getActiveAnnouncement(): Promise<ActiveAnnouncement | null> {
	return fetchActiveAnnouncement();
}

async function fetchActiveAnnouncement(): Promise<ActiveAnnouncement | null> {
	"use cache";
	cacheActiveAnnouncement();

	try {
		const now = new Date();

		const announcement = await prisma.announcementBar.findFirst({
			where: {
				isActive: true,
				startsAt: { lte: now },
				OR: [{ endsAt: null }, { endsAt: { gt: now } }],
			},
			select: {
				id: true,
				message: true,
				link: true,
				linkText: true,
				dismissDurationHours: true,
			},
			orderBy: { createdAt: "desc" },
		});

		return announcement;
	} catch (error: unknown) {
		logger.error("Failed to fetch active announcement", error, {
			service: "fetchActiveAnnouncement",
		});
		return null;
	}
}
