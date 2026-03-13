import type { AnnouncementStatus } from "../types/announcement.types";

/**
 * Determine if an announcement is currently displayable based on its schedule.
 * An announcement is "currently active" when:
 * - isActive is true
 * - startsAt <= now
 * - endsAt is null OR endsAt > now
 */
export function isCurrentlyActive(announcement: {
	isActive: boolean;
	startsAt: Date;
	endsAt: Date | null;
}): boolean {
	if (!announcement.isActive) return false;

	const now = new Date();
	if (announcement.startsAt > now) return false;
	if (announcement.endsAt && announcement.endsAt <= now) return false;

	return true;
}

/**
 * Compute the display status of an announcement for admin UI.
 */
export function computeAnnouncementStatus(announcement: {
	isActive: boolean;
	startsAt: Date;
	endsAt: Date | null;
}): AnnouncementStatus {
	const now = new Date();

	if (announcement.endsAt && announcement.endsAt <= now) {
		return "expired";
	}

	if (!announcement.isActive) {
		return "inactive";
	}

	if (announcement.startsAt > now) {
		return "scheduled";
	}

	return "active";
}

/**
 * Validate that a date range is coherent (end > start).
 */
export function isValidDateRange(startsAt: Date, endsAt: Date | null): boolean {
	if (!endsAt) return true;
	return endsAt > startsAt;
}
