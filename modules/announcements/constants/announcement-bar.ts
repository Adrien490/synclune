export const ANNOUNCEMENT_COOKIE_PREFIX = "ab-dismissed-";

export function getAnnouncementCookieName(announcementId: string): string {
	return `${ANNOUNCEMENT_COOKIE_PREFIX}${announcementId}`;
}
