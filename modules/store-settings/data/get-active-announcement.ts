import { createHash } from "node:crypto";

import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { STORE_SETTINGS_SINGLETON_ID, cacheStoreAnnouncement } from "../constants/cache";
import type { PublicAnnouncement } from "../types/store-settings.types";

/** 16-char stable hash used as dismiss cookie key — changes when the message changes */
export function hashAnnouncementMessage(message: string): string {
	return createHash("sha256").update(message).digest("hex").slice(0, 16);
}

/** Returns the currently active announcement for the storefront, or null. Fail-open. */
export async function getActiveAnnouncement(): Promise<PublicAnnouncement | null> {
	return fetchActiveAnnouncement();
}

async function fetchActiveAnnouncement(): Promise<PublicAnnouncement | null> {
	"use cache";
	cacheStoreAnnouncement();

	try {
		const settings = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: {
				announcementMessage: true,
				announcementLink: true,
				announcementStartsAt: true,
				announcementEndsAt: true,
				announcementIsActive: true,
				announcementVariant: true,
			},
		});

		if (
			!settings?.announcementIsActive ||
			!settings.announcementMessage ||
			settings.announcementMessage.trim().length === 0
		) {
			return null;
		}

		const now = Date.now();
		if (settings.announcementStartsAt && settings.announcementStartsAt.getTime() > now) {
			return null;
		}
		if (settings.announcementEndsAt && settings.announcementEndsAt.getTime() <= now) {
			return null;
		}

		return {
			message: settings.announcementMessage,
			link: settings.announcementLink,
			endsAt: settings.announcementEndsAt,
			hash: hashAnnouncementMessage(settings.announcementMessage),
			variant: settings.announcementVariant,
		};
	} catch (err) {
		logger.error("Failed to fetch active announcement", err, {
			service: "getActiveAnnouncement",
		});
		return null;
	}
}
