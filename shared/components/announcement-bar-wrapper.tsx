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
		<>
			{/*
			 * Pose `--announcement-bar-height` dès le SSR (avant hydratation) pour que
			 * la navbar — qui s'offsette via translateY(var(--announcement-bar-height)) —
			 * démarre déjà décalée sous le bandeau. Évite le saut de layout / chevauchement
			 * du premier paint (la version client de cette var n'arrivait qu'après l'effet).
			 */}
			<style>
				{`:root{--announcement-bar-height:calc(var(--ab-height) + env(safe-area-inset-top, 0px))}`}
			</style>
			<AnnouncementBar
				message={announcement.message}
				link={announcement.link}
				endsAt={announcement.endsAt}
				hash={announcement.hash}
				variant={announcement.variant}
			/>
		</>
	);
}
