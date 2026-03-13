"use server";

import { cookies } from "next/headers";

import { getAnnouncementCookieName } from "@/modules/announcements/constants/announcement-bar";

/**
 * Sets a cookie to dismiss the announcement bar for the given duration.
 * This is an internal action called by setAnnouncementDismissed.
 */
export async function dismissAnnouncementAction(
	announcementId: string,
	dismissDurationHours: number,
) {
	const cookieStore = await cookies();

	cookieStore.set(getAnnouncementCookieName(announcementId), "true", {
		httpOnly: true,
		sameSite: "strict",
		path: "/",
		maxAge: dismissDurationHours * 60 * 60,
		secure: process.env.NODE_ENV === "production",
	});

	return { success: true };
}
