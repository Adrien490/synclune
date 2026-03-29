// ============================================================================
// FAQ TYPES
// ============================================================================

/** FAQ link shape */
export interface FaqLink {
	text: string;
	href: string;
}

/** FAQ item data for display (storefront section, JSON-LD) */
export interface FaqItemData {
	question: string;
	answer: string;
	links?: FaqLink[];
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
