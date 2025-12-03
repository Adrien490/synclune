import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_SUBSCRIBER_SELECT = {
	id: true,
	email: true,
	status: true,
	subscribedAt: true,
	unsubscribedAt: true,
	confirmedAt: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.NewsletterSubscriberSelect;

export const GET_SUBSCRIBERS_SELECT = {
	...GET_SUBSCRIBER_SELECT,
} as const satisfies Prisma.NewsletterSubscriberSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_SUBSCRIBERS_DEFAULT_PER_PAGE = 20;
export const GET_SUBSCRIBERS_MAX_RESULTS_PER_PAGE = 100;

export const SORT_OPTIONS = {
	SUBSCRIBED_DESC: "subscribed-descending",
	SUBSCRIBED_ASC: "subscribed-ascending",
	EMAIL_ASC: "email-ascending",
	EMAIL_DESC: "email-descending",
	STATUS_ASC: "status-ascending",
	STATUS_DESC: "status-descending",
} as const;

export const GET_SUBSCRIBERS_SORT_FIELDS = Object.values(SORT_OPTIONS);

export const SORT_LABELS = {
	[SORT_OPTIONS.SUBSCRIBED_DESC]: "Plus récents",
	[SORT_OPTIONS.SUBSCRIBED_ASC]: "Plus anciens",
	[SORT_OPTIONS.EMAIL_ASC]: "Email A-Z",
	[SORT_OPTIONS.EMAIL_DESC]: "Email Z-A",
	[SORT_OPTIONS.STATUS_ASC]: "Actifs d'abord",
	[SORT_OPTIONS.STATUS_DESC]: "Inactifs d'abord",
} as const;

// ============================================================================
// SELECT DEFINITIONS - NEWSLETTER STATUS
// ============================================================================

export const GET_NEWSLETTER_STATUS_DEFAULT_SELECT = {
	status: true,
} as const satisfies Prisma.NewsletterSubscriberSelect;
