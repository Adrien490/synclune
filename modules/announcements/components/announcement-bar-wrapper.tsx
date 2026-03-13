import { cookies } from "next/headers";
import { AnnouncementBar } from "./announcement-bar/announcement-bar";
import { getActiveAnnouncement } from "../data/get-active-announcement";
import { getAnnouncementCookieName } from "@/modules/announcements/constants/announcement-bar";

/**
 * Server component wrapper that fetches the active announcement,
 * checks the dismiss cookie, and renders the client AnnouncementBar.
 *
 * If the cookie exists, returns null → zero JS sent, zero flash.
 */
export async function AnnouncementBarWrapper() {
	const announcement = await getActiveAnnouncement();

	if (!announcement) return null;

	const cookieStore = await cookies();
	const isDismissed = cookieStore.get(getAnnouncementCookieName(announcement.id))?.value === "true";

	if (isDismissed) return null;

	return (
		<AnnouncementBar
			message={announcement.message}
			link={announcement.link ?? undefined}
			linkText={announcement.linkText ?? undefined}
			announcementId={announcement.id}
			dismissDurationHours={announcement.dismissDurationHours}
		/>
	);
}
