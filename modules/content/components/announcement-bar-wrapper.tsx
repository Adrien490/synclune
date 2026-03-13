import { AnnouncementBar } from "./announcement-bar/announcement-bar";

import { getActiveAnnouncement } from "../data/get-active-announcement";

/**
 * Server component wrapper that fetches the active announcement
 * and renders the client AnnouncementBar component.
 *
 * Uses storageKey={announcement.id} so each new announcement
 * gets a fresh localStorage dismiss state.
 */
export async function AnnouncementBarWrapper() {
	const announcement = await getActiveAnnouncement();

	if (!announcement) return null;

	return (
		<AnnouncementBar
			message={announcement.message}
			link={announcement.link ?? undefined}
			linkText={announcement.linkText ?? undefined}
			storageKey={announcement.id}
			dismissDurationHours={announcement.dismissDurationHours}
		/>
	);
}
