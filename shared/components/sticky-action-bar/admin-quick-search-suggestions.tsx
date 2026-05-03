"use client";

import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import type { AdminQuickSearchSuggestion } from "./admin-quick-search.types";

interface AdminQuickSearchSuggestionsProps {
	suggestions: AdminQuickSearchSuggestion[];
	onSelect: (value: string) => void;
}

/**
 * Horizontal scrollable suggestion pills shown in idle state (above recents).
 *
 * Adapter-provided per scope (e.g. product types for products page,
 * order statuses for orders page, etc.).
 */
export function AdminQuickSearchSuggestions({
	suggestions,
	onSelect,
}: AdminQuickSearchSuggestionsProps) {
	const haptic = useHaptic();

	if (suggestions.length === 0) return null;

	const handleClick = (value: string) => {
		haptic("selection");
		onSelect(value);
	};

	return (
		<div
			className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
			role="group"
			aria-label="Suggestions de recherche"
		>
			{suggestions.map((s) => (
				<button
					key={s.value}
					type="button"
					onClick={() => handleClick(s.value)}
					className={cn(
						"border-border bg-background hover:bg-muted active:bg-muted",
						"focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1.5 text-xs",
						"focus-visible:ring-2 focus-visible:outline-none",
						"motion-safe:transition-colors motion-safe:duration-150",
					)}
				>
					{s.label}
				</button>
			))}
		</div>
	);
}
