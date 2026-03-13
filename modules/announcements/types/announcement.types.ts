import type { AnnouncementBar } from "@/app/generated/prisma/client";

// ============================================================================
// ANNOUNCEMENT BAR TYPES
// ============================================================================

/** Announcement data for admin list */
export type AnnouncementListItem = Pick<
	AnnouncementBar,
	| "id"
	| "message"
	| "link"
	| "linkText"
	| "startsAt"
	| "endsAt"
	| "isActive"
	| "dismissDurationHours"
	| "createdAt"
	| "updatedAt"
>;

/** Announcement data for storefront display */
export type ActiveAnnouncement = Pick<
	AnnouncementBar,
	"id" | "message" | "link" | "linkText" | "dismissDurationHours"
>;

/** Computed announcement display status */
export type AnnouncementStatus = "active" | "scheduled" | "expired" | "inactive";

/** Data passed to announcement form dialog */
export interface AnnouncementDialogData {
	announcement?: AnnouncementListItem;
	[key: string]: unknown;
}

/** Data passed to delete announcement alert dialog */
export interface DeleteAnnouncementData {
	announcementId: string;
	announcementMessage: string;
	[key: string]: unknown;
}
