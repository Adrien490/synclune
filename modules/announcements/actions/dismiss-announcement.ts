import { cookies } from "next/headers";

import { getAnnouncementCookieName } from "@/modules/announcements/constants/announcement-bar";

/**
 * Sets a cookie to dismiss the announcement bar for the given duration.
 * Internal helper — NOT exposed as a Server Action. Called only from
 * setAnnouncementDismissed which validates input and enforces rate limiting.
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
