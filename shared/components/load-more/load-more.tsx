"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useInView } from "@/shared/hooks/use-in-view";
import { toast } from "@/shared/utils/toast";

export interface LoadMoreResult<TItem> {
	items: TItem[];
	nextCursor: string | null;
	hasMore: boolean;
	error?: string;
}

export interface LoadMoreProps<TItem> {
	/** Initial cursor (last id of the server-rendered page). */
	initialCursor: string | null;
	/** Whether the server reports more pages available. */
	initialHasMore: boolean;
	/** Number of items already displayed (server-rendered). */
	initialDisplayedCount: number;
	/** Total matching items across all pages (counter denominator). */
	totalCount: number;
	/** Server action loading the next page. */
	loadFn: (cursor: string) => Promise<LoadMoreResult<TItem>>;
	/** Render-prop for each item. Receive index relative to *all* additional items. */
	renderItem: (item: TItem, index: number) => ReactNode;
	/** Stable key extractor. */
	getItemKey: (item: TItem) => string;
	/** id of the list this button extends — used for aria-controls. */
	controlsId?: string;
	/** Singular label ("avis", "produit"). Used in counter + sr announcement. */
	itemsLabel: string;
	/** Plural label. Defaults to `${itemsLabel}s`. */
	itemsLabelPlural?: string;
	/** Button label. Defaults to "Voir plus". */
	buttonLabel?: string;
	/** Generic error message for unexpected throws. */
	errorMessage?: string;
	/** Enable IntersectionObserver auto-load when button is 80% visible. */
	enableAutoLoad?: boolean;
	/** Auto-load threshold (0..1). Default 0.8. */
	autoLoadThreshold?: number;
	/** Auto-load rootMargin (preload before visible). */
	autoLoadRootMargin?: string;
	/** Tailwind classes for the items container. Defaults to single-column grid. */
	itemsContainerClassName?: string;
	/** aria-label for the items container. */
	itemsContainerLabel?: string;
}

/**
 * Generic Load More component.
 *
 * Append-style pagination (vs. URL-driven CursorPagination): keeps server-rendered
 * items + appends additional items in local state. Used for feeds (reviews,
 * product catalogue on mobile) where lecture passive prime sur navigation ciblée.
 *
 * Parent must remount via `key` derived from filter/sort searchParams to avoid
 * stale local state across re-renders (see ReviewsLoadMore call-site).
 */
export function LoadMore<TItem>({
	initialCursor,
	initialHasMore,
	initialDisplayedCount,
	totalCount,
	loadFn,
	renderItem,
	getItemKey,
	controlsId,
	itemsLabel,
	itemsLabelPlural,
	buttonLabel = "Voir plus",
	errorMessage = "Impossible de charger plus d'éléments",
	enableAutoLoad = false,
	autoLoadThreshold = 0.8,
	autoLoadRootMargin,
	itemsContainerClassName = "grid grid-cols-1 gap-4 lg:grid-cols-2",
	itemsContainerLabel,
}: LoadMoreProps<TItem>) {
	const [additionalItems, setAdditionalItems] = useState<TItem[]>([]);
	const [cursor, setCursor] = useState(initialCursor);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [statusMessage, setStatusMessage] = useState("");
	const [isPending, startTransition] = useTransition();

	const firstNewItemRef = useRef<HTMLLIElement | null>(null);
	const previousLengthRef = useRef(0);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const lastAutoLoadCursorRef = useRef<string | null>(null);

	const plural = itemsLabelPlural ?? `${itemsLabel}s`;

	useEffect(() => {
		if (additionalItems.length > previousLengthRef.current) {
			firstNewItemRef.current?.focus();
		}
		previousLengthRef.current = additionalItems.length;
	}, [additionalItems.length]);

	const isButtonVisible = useInView(buttonRef, {
		threshold: autoLoadThreshold,
		rootMargin: autoLoadRootMargin,
		enabled: enableAutoLoad && hasMore && !!cursor,
	});

	const handleLoadMore = () => {
		if (!cursor) return;
		const currentCursor = cursor;

		startTransition(async () => {
			try {
				const result = await loadFn(currentCursor);

				if (result.error) {
					toast.error(result.error);
					return;
				}

				const loadedCount = result.items.length;
				setAdditionalItems((prev) => [...prev, ...result.items]);
				setCursor(result.nextCursor);
				setHasMore(result.hasMore);
				const newDisplayed = initialDisplayedCount + additionalItems.length + loadedCount;
				const labelLoaded = loadedCount > 1 ? plural : itemsLabel;
				const adj = loadedCount > 1 ? "nouveaux" : "nouvel";
				setStatusMessage(
					`${loadedCount} ${adj} ${labelLoaded} chargé${loadedCount > 1 ? "s" : ""}. ${newDisplayed} sur ${totalCount} ${plural} affichés.`,
				);
			} catch {
				toast.error(errorMessage);
			}
		});
	};

	// Auto-load when button enters viewport (only once per cursor to avoid loops).
	useEffect(() => {
		if (!enableAutoLoad) return;
		if (!isButtonVisible) return;
		if (isPending) return;
		if (!cursor) return;
		if (lastAutoLoadCursorRef.current === cursor) return;
		lastAutoLoadCursorRef.current = cursor;
		handleLoadMore();
		// handleLoadMore is stable enough — only cursor + visibility matter as triggers.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isButtonVisible, isPending, cursor, enableAutoLoad]);

	if (!hasMore && additionalItems.length === 0) {
		return null;
	}

	const displayedCount = initialDisplayedCount + additionalItems.length;
	const firstNewIndex = additionalItems.length === 0 ? -1 : 0;

	return (
		<>
			<p role="status" aria-live="polite" className="sr-only">
				{statusMessage}
			</p>

			{additionalItems.length > 0 && (
				// eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none
				<ul
					role="list"
					aria-label={itemsContainerLabel ?? `${plural} supplémentaires`}
					className={itemsContainerClassName}
				>
					{additionalItems.map((item, index) => {
						const isFirstNew = index === firstNewIndex;
						return (
							<li
								key={getItemKey(item)}
								ref={isFirstNew ? firstNewItemRef : undefined}
								tabIndex={isFirstNew ? -1 : undefined}
								className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4"
								style={{
									animationDelay: `${Math.min(index, 9) * 50}ms`,
									animationFillMode: "backwards",
								}}
							>
								{renderItem(item, index)}
							</li>
						);
					})}
				</ul>
			)}

			{(hasMore || additionalItems.length > 0) && (
				<div className="flex flex-col items-center gap-2 pt-2">
					{totalCount > 0 && (
						<p className="text-muted-foreground text-sm">
							{displayedCount} sur {totalCount} {plural} affichés
						</p>
					)}
					{hasMore && (
						<Button
							ref={buttonRef}
							variant="outline"
							onClick={handleLoadMore}
							disabled={isPending}
							aria-controls={controlsId}
							aria-busy={isPending}
							className="min-w-[200px]"
						>
							{isPending ? (
								<>
									<LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
									Chargement…
								</>
							) : (
								buttonLabel
							)}
						</Button>
					)}
				</div>
			)}
		</>
	);
}
