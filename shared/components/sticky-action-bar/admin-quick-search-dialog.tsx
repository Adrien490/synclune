"use client";

import { Loader2, Search, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useTransition,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type TouchEvent as ReactTouchEvent,
} from "react";

import { Fade } from "@/shared/components/animations/fade";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import { AdminQuickSearchRecents } from "./admin-quick-search-recents";
import { AdminQuickSearchResultsList } from "./admin-quick-search-results-list";
import { AdminQuickSearchSuggestions } from "./admin-quick-search-suggestions";
import type { AdminQuickSearchAdapter, AdminQuickSearchResult } from "./admin-quick-search.types";
import { useAdminRecentSearches } from "./use-admin-recent-searches";

const SEARCH_DEBOUNCE_MS = 300;
const SWIPE_DOWN_THRESHOLD = 80;
const RESULTS_CONTAINER_ID_PREFIX = "admin-qs-results-";
const FOCUSABLE_SELECTOR = '[role="option"]:not([aria-disabled="true"])';

interface AdminQuickSearchDialogProps<TItem> {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	adapter: AdminQuickSearchAdapter<TItem>;
}

/**
 * Shared admin mobile search dialog.
 *
 * Mirror visuel de `QuickSearchDialog` boutique (full-height bottom sheet, drag
 * handle, header centré) avec data flow scoped admin :
 * - tap résultat → navigate to detail URL via `adapter.getResultHref`
 * - submit Enter / "Voir N résultats" → `?search=q` sur la page admin courante
 * - tap recent → relance la recherche live (PAS de redirect)
 *
 * Pluggable via `adapter` (10 scopes : products, orders, users, etc.).
 */
export function AdminQuickSearchDialog<TItem>({
	open,
	onOpenChange,
	adapter,
}: AdminQuickSearchDialogProps<TItem>) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const haptic = useHaptic();

	const minQueryLength = adapter.minQueryLength ?? 2;
	const resultsContainerId = `${RESULTS_CONTAINER_ID_PREFIX}${adapter.scope}`;

	const { searches, add, remove, clear, restore } = useAdminRecentSearches(adapter.scope);

	const initialUrlSearch = searchParams.get("search") ?? "";
	const [value, setValue] = useState(initialUrlSearch);
	const [result, setResult] = useState<AdminQuickSearchResult<TItem> | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isSearching, setIsSearching] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const listboxRef = useRef<HTMLDivElement>(null);
	const focusablesRef = useRef<HTMLElement[]>([]);

	const [activeIndex, setActiveIndex] = useState(-1);
	// eslint-disable-next-line react-hooks/refs
	const activeDescendantId = activeIndex >= 0 ? focusablesRef.current[activeIndex]?.id : undefined;

	// Capture trigger before Radix steals focus
	useLayoutEffect(() => {
		if (open) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [open]);

	// Sync input with URL when (re)opening
	useEffect(() => {
		if (open) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setValue(initialUrlSearch);
			setActiveIndex(-1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// Cleanup debounce on close
	useEffect(() => {
		if (open) return;
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setResult(null);
		setIsSearching(false);
	}, [open]);

	// Cache focusables (results) for keyboard nav — refresh on result change
	useEffect(() => {
		const container = listboxRef.current;
		if (!container) return;
		focusablesRef.current = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
	}, [result, value]);

	const isSearchMode = value.trim().length >= minQueryLength;
	const hasPartialInput = value.trim().length > 0 && !isSearchMode;

	const runSearch = useCallback(
		async (query: string) => {
			const requestId = ++requestIdRef.current;
			setIsSearching(true);
			try {
				const next = await adapter.search(query);
				if (requestId !== requestIdRef.current) return; // stale
				setResult(next);
				setActiveIndex(-1);
			} catch {
				if (requestId !== requestIdRef.current) return;
				setResult({ kind: "error" });
			} finally {
				if (requestId === requestIdRef.current) setIsSearching(false);
			}
		},
		[adapter],
	);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const next = e.target.value;
		setValue(next);

		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = next.trim();
		if (trimmed.length < minQueryLength) {
			setResult(null);
			setIsSearching(false);
			return;
		}

		debounceRef.current = setTimeout(() => {
			void runSearch(trimmed);
		}, SEARCH_DEBOUNCE_MS);
	};

	const filterCurrentPage = useCallback(
		(term: string) => {
			const params = new URLSearchParams(searchParams);
			params.delete("cursor");
			params.delete("direction");
			if (term) params.set("search", term);
			else params.delete("search");
			const url = `${pathname}?${params.toString()}`;
			startTransition(() => {
				router.push(url, { scroll: false });
			});
		},
		[pathname, router, searchParams],
	);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const term = value.trim();
		haptic("medium");
		if (term) add(term);
		filterCurrentPage(term);
		onOpenChange(false);
	};

	const handleClear = () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		haptic("light");
		setValue("");
		setResult(null);
		setIsSearching(false);
		inputRef.current?.focus();
	};

	const handleClose = () => {
		haptic("selection");
		onOpenChange(false);
	};

	const handleRecentTap = (term: string) => {
		setValue(term);
		setActiveIndex(-1);
		void runSearch(term);
		inputRef.current?.focus();
	};

	const handleSuggestionTap = (val: string) => {
		setValue(val);
		setActiveIndex(-1);
		void runSearch(val);
		inputRef.current?.focus();
	};

	const handleResultSelect = () => {
		const term = value.trim();
		if (term) add(term);
		onOpenChange(false);
	};

	const handleViewAllResults = () => {
		const term = value.trim();
		if (!term) return;
		haptic("medium");
		add(term);
		filterCurrentPage(term);
		onOpenChange(false);
	};

	const handleRetry = () => {
		const term = value.trim();
		if (term.length >= minQueryLength) void runSearch(term);
	};

	// Keyboard navigation in results listbox
	const handleListboxKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		const focusables = focusablesRef.current;
		if (focusables.length === 0) return;

		switch (e.key) {
			case "ArrowDown": {
				e.preventDefault();
				const next = activeIndex < focusables.length - 1 ? activeIndex + 1 : 0;
				setActiveIndex(next);
				haptic("selection");
				focusables[next]?.scrollIntoView({ block: "nearest" });
				break;
			}
			case "ArrowUp": {
				e.preventDefault();
				const next = activeIndex > 0 ? activeIndex - 1 : focusables.length - 1;
				setActiveIndex(next);
				haptic("selection");
				focusables[next]?.scrollIntoView({ block: "nearest" });
				break;
			}
			case "Home": {
				e.preventDefault();
				setActiveIndex(0);
				focusables[0]?.scrollIntoView({ block: "nearest" });
				break;
			}
			case "End": {
				e.preventDefault();
				setActiveIndex(focusables.length - 1);
				focusables[focusables.length - 1]?.scrollIntoView({ block: "nearest" });
				break;
			}
			case "Enter": {
				if (activeIndex >= 0 && focusables[activeIndex]) {
					e.preventDefault();
					focusables[activeIndex].click();
				}
				break;
			}
		}
	};

	const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown" && focusablesRef.current.length > 0) {
			e.preventDefault();
			setActiveIndex(0);
			focusablesRef.current[0]?.scrollIntoView({ block: "nearest" });
		}
	};

	// Swipe-down to dismiss (mobile)
	const touchStartYRef = useRef<number | null>(null);
	const touchDeltaYRef = useRef(0);

	const handleHeaderTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			touchStartYRef.current = y;
			touchDeltaYRef.current = 0;
		}
	};
	const handleHeaderTouchMove = (e: ReactTouchEvent<HTMLElement>) => {
		if (touchStartYRef.current === null) return;
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			touchDeltaYRef.current = y - touchStartYRef.current;
		}
	};
	const handleHeaderTouchEnd = () => {
		const delta = touchDeltaYRef.current;
		touchStartYRef.current = null;
		touchDeltaYRef.current = 0;
		if (delta > SWIPE_DOWN_THRESHOLD) {
			haptic("medium");
			onOpenChange(false);
		}
	};

	const showSuggestions =
		!isSearchMode && (adapter.suggestions?.length ?? 0) > 0 && value.length === 0;
	const showRecents = !isSearchMode && value.length === 0 && searches.length > 0;
	const showEmptyState =
		!isSearchMode &&
		value.length === 0 &&
		searches.length === 0 &&
		(adapter.suggestions?.length ?? 0) === 0;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onOpenChange(false);
			}}
		>
			<DialogContent
				showCloseButton={false}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					triggerRef.current?.focus();
				}}
				aria-busy={isPending || isSearching || undefined}
				className={cn(
					"group/admin-search",
					// Mobile : full-height bottom-sheet
					"fixed inset-0 top-0 right-0 bottom-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0",
					"overflow-hidden rounded-none border-0",
					"motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:slide-out-to-bottom",
					"motion-safe:data-[state=open]:zoom-in-100 motion-safe:data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop : centered modal (fallback rare — desktop toolbar a son SearchInput inline)
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:h-[min(640px,85vh)] md:w-full md:max-w-160 md:rounded-xl md:border",
					"motion-safe:md:data-[state=open]:slide-in-from-top-4 motion-safe:md:data-[state=open]:zoom-in-95",
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"bg-background sticky top-0 z-10 shrink-0",
						"border-border border-b md:border-b-0",
					)}
					onTouchStart={handleHeaderTouchStart}
					onTouchMove={handleHeaderTouchMove}
					onTouchEnd={handleHeaderTouchEnd}
				>
					{/* Drag handle (mobile only) */}
					<div className="flex justify-center pt-2 pb-1 md:hidden" aria-hidden="true">
						<span className="bg-muted-foreground/30 h-1.5 w-10 rounded-full" />
					</div>
					<div className="flex h-14 items-center px-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							className="size-11 shrink-0 md:hidden"
							aria-label="Fermer la recherche"
						>
							<X className="size-5" aria-hidden="true" />
						</Button>

						<DialogTitle className="font-display flex-1 text-center text-lg font-medium md:text-left">
							Rechercher
						</DialogTitle>
						<DialogDescription className="sr-only">
							Tapez pour rechercher. Sélectionnez un résultat pour ouvrir le détail, ou validez pour
							filtrer la liste.
						</DialogDescription>

						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							className="hidden size-10 shrink-0 md:inline-flex"
							aria-label="Fermer la recherche"
						>
							<X className="size-4" aria-hidden="true" />
						</Button>

						{/* Spacer to center title on mobile */}
						<div className="size-11 shrink-0 md:hidden" aria-hidden="true" />
					</div>
				</header>

				{/* Search input */}
				<form
					onSubmit={handleSubmit}
					role="search"
					data-pending={isPending || isSearching ? "" : undefined}
					aria-busy={isPending || isSearching || undefined}
					className="bg-background shrink-0 px-4 py-3"
				>
					<div className="relative">
						{isSearching ? (
							<Loader2
								className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 motion-safe:animate-spin"
								aria-hidden="true"
							/>
						) : (
							<Search
								className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
								aria-hidden="true"
							/>
						)}
						<input
							ref={inputRef}
							name="search"
							type="search"
							inputMode="search"
							enterKeyHint="search"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							// eslint-disable-next-line jsx-a11y/no-autofocus -- explicit user-opened search dialog
							autoFocus
							value={value}
							onChange={handleInputChange}
							onKeyDown={handleInputKeyDown}
							placeholder={adapter.placeholder}
							aria-label={adapter.ariaLabel}
							aria-controls={resultsContainerId}
							aria-expanded={isSearchMode}
							// eslint-disable-next-line react-hooks/refs
							aria-activedescendant={activeDescendantId}
							role="combobox"
							autoComplete="off"
							maxLength={100}
							className={cn(
								"border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring",
								"flex h-11 w-full rounded-lg border py-2 pr-10 pl-10 text-sm",
								"focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
						/>
						{value.length > 0 && (
							<button
								type="button"
								onClick={handleClear}
								className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
								aria-label="Effacer la recherche"
							>
								<X className="size-4" aria-hidden="true" />
							</button>
						)}
					</div>
				</form>

				{/* Suggestions (idle) */}
				{showSuggestions && adapter.suggestions && (
					<div className="bg-background shrink-0 px-4 pb-2">
						<AdminQuickSearchSuggestions
							suggestions={adapter.suggestions}
							onSelect={handleSuggestionTap}
						/>
					</div>
				)}

				{/* Hint when input below min length */}
				{hasPartialInput && (
					<p className="text-muted-foreground px-4 pb-2 text-xs">
						Tapez au moins {minQueryLength} caractères pour rechercher
					</p>
				)}

				<span role="status" aria-live="polite" className="sr-only">
					{isSearching
						? "Chargement des résultats…"
						: result?.kind === "success"
							? `${result.totalCount} résultat${result.totalCount !== 1 ? "s" : ""}`
							: ""}
				</span>

				{/* Content area : results / recents / empty state */}
				<div
					ref={listboxRef}
					id={resultsContainerId}
					role="listbox"
					aria-label="Résultats de recherche"
					tabIndex={-1}
					onKeyDown={handleListboxKeyDown}
					className={cn(
						"min-h-0 flex-1 overflow-y-auto",
						"group-has-[[data-pending]]/admin-search:opacity-50",
						"motion-safe:transition-opacity motion-safe:duration-200",
					)}
				>
					<AnimatePresence mode="wait">
						{isSearchMode ? (
							<Fade key="results" y={6} className="h-full">
								<AdminQuickSearchResultsList
									adapter={adapter}
									result={result}
									query={value.trim()}
									isPending={isSearching}
									// eslint-disable-next-line react-hooks/refs
									activeDescendantId={activeDescendantId}
									onSelect={handleResultSelect}
									onViewAllResults={handleViewAllResults}
									onRetry={handleRetry}
								/>
							</Fade>
						) : (
							<Fade key="idle" y={6} className="h-full">
								<div className="px-4 pb-4">
									{showRecents && (
										<AdminQuickSearchRecents
											searches={searches}
											onTap={handleRecentTap}
											onRemove={remove}
											onClearAll={clear}
											onRestore={restore}
										/>
									)}
									{showEmptyState && (
										<div
											data-testid="admin-quick-search-empty-state"
											className="text-muted-foreground mt-8 flex flex-col items-center gap-2 px-4 text-center text-sm"
										>
											<Search className="size-6 opacity-40" aria-hidden="true" />
											<p>Tapez pour rechercher.</p>
											<p className="text-xs">Vos recherches récentes apparaîtront ici.</p>
										</div>
									)}
								</div>
							</Fade>
						)}
					</AnimatePresence>
				</div>

				{/* Safe area bottom (mobile) */}
				<div
					className="bg-background h-[env(safe-area-inset-bottom,0)] shrink-0 md:hidden"
					aria-hidden="true"
				/>
			</DialogContent>
		</Dialog>
	);
}
