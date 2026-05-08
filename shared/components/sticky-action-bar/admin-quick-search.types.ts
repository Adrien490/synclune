import type { ReactNode } from "react";

/**
 * Pluggable adapter contract for the shared `AdminQuickSearchDialog`.
 *
 * Each admin list page provides one adapter that defines:
 * - the live search server call (auth + rate-limit handled inside)
 * - how each result is rendered as a card
 * - where tapping a result navigates to (entity detail page)
 * - optional suggestion pills shown in idle state
 *
 * Mirror visuel de `QuickSearchDialog` boutique mais data flow scoped admin :
 * tap résultat = navigation détail, submit = filtre `?search=` sur la page courante.
 */
export interface AdminQuickSearchAdapter<TItem> {
	/** localStorage key suffix for recents (e.g. "products", "orders"). */
	scope: string;
	/** Visible placeholder shown in the input. */
	placeholder: string;
	/** Accessible label for the input. */
	ariaLabel: string;
	/**
	 * Server action live search. Returns top items + total count.
	 * The action handles auth (requireAdmin), rate limit and validation.
	 */
	search: (query: string) => Promise<AdminQuickSearchResult<TItem>>;
	/** Stable ID per item used for `aria-activedescendant` and keyboard nav. */
	getResultId: (item: TItem) => string;
	/** Detail URL — tapping a result navigates here (and closes the drawer). */
	getResultHref: (item: TItem) => string;
	/** Short text label used for sr-only announcements and recents storage. */
	getResultLabel: (item: TItem) => string;
	/** Render the card body (image + title + meta) inside the result link. */
	renderResultItem: (item: TItem, ctx: AdminQuickSearchRenderContext) => ReactNode;
	/** Optional suggestion pills shown in idle state (above recents). */
	suggestions?: AdminQuickSearchSuggestion[];
	/** Minimum query length to trigger search. Default = 2. */
	minQueryLength?: number;
}

interface AdminQuickSearchRenderContext {
	/** DOM id for the rendered link (matches getResultId). */
	id: string;
	/** True when this option is the active descendant (keyboard nav). */
	isActive: boolean;
	/** Current query string — pass to highlighters if needed. */
	query: string;
}

export interface AdminQuickSearchSuggestion {
	/** Label rendered inside the pill. */
	label: string;
	/** Value sent to the search input on tap (often == label). */
	value: string;
}

export type AdminQuickSearchResult<T> =
	| { kind: "success"; items: T[]; totalCount: number }
	| { kind: "rate-limited"; message?: string }
	| { kind: "error"; message?: string };
