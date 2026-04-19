import { cookies } from "next/headers";

import { getActiveAnnouncement } from "@/modules/store-settings/data/get-active-announcement";

import { AnnouncementBar } from "./announcement-bar";

/**
 * Server wrapper: reads the active announcement from StoreSettings, checks the
 * dismiss cookie (keyed by message hash so editing the message resets dismissal),
 * and renders the client bar. Returns null when nothing should be shown so no
 * client JS is hydrated and no layout flash occurs.
 */
export async function AnnouncementBarWrapper() {
	const announcement = await getActiveAnnouncement();
	if (!announcement) return null;

	const cookieStore = await cookies();
	if (cookieStore.get(`announcement_dismissed_${announcement.hash}`)) {
		return null;
	}

	return (
		<AnnouncementBar
			message={announcement.message}
			link={announcement.link}
			endsAt={announcement.endsAt}
			hash={announcement.hash}
		/>
	);
}
