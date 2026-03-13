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

// ============================================================================
// FAQ TYPES
// ============================================================================

/** FAQ link shape matching the existing FaqLink interface */
export interface FaqLink {
	text: string;
	href: string;
}

/** FAQ item data for admin list */
export interface FaqListItem {
	id: string;
	question: string;
	answer: string;
	links: FaqLink[] | null;
	position: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/** FAQ item data for storefront display */
export interface FaqItemPublic {
	question: string;
	answer: string;
	links: FaqLink[] | null;
}

/** Data passed to FAQ form dialog */
export interface FaqDialogData {
	faqItem?: FaqListItem;
	[key: string]: unknown;
}

/** Data passed to delete FAQ alert dialog */
export interface DeleteFaqData {
	faqItemId: string;
	faqItemQuestion: string;
	[key: string]: unknown;
}
