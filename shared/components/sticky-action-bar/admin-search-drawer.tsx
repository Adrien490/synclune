"use client";

import { Clock, Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { toast } from "@/shared/utils/toast";

const RECENT_SEARCHES_MAX_ITEMS = 5;
const RECENT_SEARCHES_MAX_TERM_LENGTH = 100;
const RECENT_SEARCHES_STORAGE_PREFIX = "synclune:admin-recent-searches:";

const recentSearchTermSchema = z.string().trim().min(1).max(RECENT_SEARCHES_MAX_TERM_LENGTH);
const recentSearchesStorageSchema = z.array(recentSearchTermSchema).max(RECENT_SEARCHES_MAX_ITEMS);

function recentSearchesStorageKey(scope: string): string {
	return `${RECENT_SEARCHES_STORAGE_PREFIX}${scope}`;
}

function readRecentSearches(scope: string): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(recentSearchesStorageKey(scope));
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		const result = recentSearchesStorageSchema.safeParse(parsed);
		return result.success ? result.data : [];
	} catch {
		return [];
	}
}

function writeRecentSearches(scope: string, searches: string[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(recentSearchesStorageKey(scope), JSON.stringify(searches));
	} catch {
		// QuotaExceededError, private mode, etc. — silent no-op
	}
}

interface AdminSearchDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Visible placeholder (domain-specific). */
	placeholder: string;
	/** Accessible label for the input. */
	ariaLabel: string;
	/**
	 * Storage scope pour les recherches récentes (ex: `"products"`, `"orders"`).
	 * Isole les recents par page admin pour éviter le mix cross-domain.
	 */
	scope: string;
}

const LIVE_DEBOUNCE_MS = 300;

/**
 * Drawer partagé utilisé par toutes les `StickyActionBar` admin pour la
 * saisie de recherche mobile.
 *
 * Features natives 2026 :
 * - Live debounced search (300ms) via `useTransition` + `router.replace`
 * - Recent searches locales par scope (localStorage, cap 5, undo toast)
 * - Haptic feedback (submit/clear/selection/close)
 * - Close button explicite 44×44 + drag handle Vaul + swipe-down natif
 * - Input polish : autoCorrect/autoCapitalize/spellCheck off, data-vaul-no-drag
 * - `aria-busy` + `aria-live` sr-only pour annonces transition
 * - Focus restoration native via Vaul
 */
export function AdminSearchDrawer({
	open,
	onOpenChange,
	placeholder,
	ariaLabel,
	scope,
}: AdminSearchDrawerProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const haptic = useHaptic();

	const [searches, setSearches] = useState<string[]>([]);

	useEffect(() => {
		setSearches(readRecentSearches(scope));
	}, [scope]);

	function persistRecents(next: string[]) {
		setSearches(next);
		writeRecentSearches(scope, next);
	}

	function add(term: string) {
		const parsed = recentSearchTermSchema.safeParse(term.toLowerCase());
		if (!parsed.success) return;
		const normalized = parsed.data;
		setSearches((prev) => {
			const without = prev.filter((t) => t !== normalized);
			const next = [normalized, ...without].slice(0, RECENT_SEARCHES_MAX_ITEMS);
			writeRecentSearches(scope, next);
			return next;
		});
	}

	function remove(term: string) {
		const normalized = term.trim().toLowerCase();
		setSearches((prev) => {
			const next = prev.filter((t) => t !== normalized);
			writeRecentSearches(scope, next);
			return next;
		});
	}

	function clear() {
		persistRecents([]);
	}

	function restore(snapshot: string[]) {
		const valid = recentSearchesStorageSchema.safeParse(snapshot);
		if (!valid.success) return;
		persistRecents(valid.data);
	}

	const urlSearchValue = searchParams.get("search") ?? "";
	const [value, setValue] = useState(urlSearchValue);
	const [isPending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync input quand le drawer (re)ouvre : reflète l'URL actuelle.
	useEffect(() => {
		if (open) setValue(urlSearchValue);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// Cleanup debounce timer on close / unmount.
	useEffect(() => {
		if (open) return;
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}
	}, [open]);

	const pushSearch = useCallback(
		(term: string, mode: "push" | "replace") => {
			const params = new URLSearchParams(searchParams);
			params.delete("cursor");
			params.delete("direction");
			if (term) params.set("search", term);
			else params.delete("search");
			const url = `?${params.toString()}`;
			startTransition(() => {
				if (mode === "push") router.push(url, { scroll: false });
				else router.replace(url, { scroll: false });
			});
		},
		[router, searchParams],
	);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const next = e.target.value;
		setValue(next);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			pushSearch(next.trim(), "replace");
		}, LIVE_DEBOUNCE_MS);
	};

	// `push` (vs `replace` du live debounce) crée une entrée dans l'historique
	// pour que le bouton Back du navigateur revienne à l'état pré-recherche.
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const term = value.trim();
		haptic("medium");
		if (term) add(term);
		pushSearch(term, "push");
		onOpenChange(false);
	};

	const handleClear = () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		haptic("light");
		setValue("");
		if (searchParams.has("search")) pushSearch("", "replace");
		inputRef.current?.focus();
	};

	const handleClose = () => {
		haptic("selection");
		onOpenChange(false);
	};

	const handleRecentTap = (term: string) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		haptic("selection");
		setValue(term);
		add(term);
		pushSearch(term, "push");
		onOpenChange(false);
	};

	const handleRecentRemove = (term: string) => {
		haptic("light");
		remove(term);
	};

	const handleClearAll = () => {
		const snapshot = [...searches];
		if (snapshot.length === 0) return;
		haptic("light");
		clear();
		toast.success(
			snapshot.length === 1 ? "Recherche effacée" : `${snapshot.length} recherches effacées`,
			{
				action: {
					label: "Annuler",
					onClick: () => restore(snapshot),
				},
				duration: 5000,
			},
		);
	};

	const hasInputValue = value.trim().length > 0;
	const showRecents = !hasInputValue && searches.length > 0;
	const showEmptyState = !hasInputValue && searches.length === 0;

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				data-pending={isPending ? "" : undefined}
				onOverlayClick={() => haptic("selection")}
			>
				<DrawerHeader className="flex flex-row items-center justify-between gap-2">
					<DrawerTitle>Rechercher</DrawerTitle>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-11 shrink-0"
						aria-label="Fermer la recherche"
						onClick={handleClose}
					>
						<X className="size-5" aria-hidden="true" />
					</Button>
				</DrawerHeader>
				<DrawerBody style={{ maxHeight: "calc(var(--vvh, 100dvh) - 8rem)" }}>
					<form
						onSubmit={handleSubmit}
						role="search"
						className="flex flex-col gap-4"
						aria-busy={isPending || undefined}
					>
						<div className="relative">
							{isPending ? (
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
								data-vaul-no-drag
								// eslint-disable-next-line jsx-a11y/no-autofocus -- Drawer context: user explicitly opened search
								autoFocus
								value={value}
								onChange={handleInputChange}
								placeholder={placeholder}
								aria-label={ariaLabel}
								className={cn(
									"border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-lg border py-2 pr-10 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
							/>
							{hasInputValue && (
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
						<Button type="submit" className="w-full">
							Rechercher
						</Button>
					</form>

					{showEmptyState && (
						<div
							data-testid="admin-search-empty-state"
							className="text-muted-foreground mt-8 flex flex-col items-center gap-2 px-4 text-center text-sm"
						>
							<Search className="size-6 opacity-40" aria-hidden="true" />
							<p>Tapez pour rechercher.</p>
							<p className="text-xs">Vos recherches récentes apparaîtront ici.</p>
						</div>
					)}

					{showRecents && (
						<section aria-label="Recherches récentes" className="mt-6 flex flex-col gap-1">
							<header className="flex items-center justify-between px-1 pb-1">
								<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Récentes
								</h3>
								{searches.length >= 2 && (
									<button
										type="button"
										onClick={handleClearAll}
										className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
									>
										Effacer tout
									</button>
								)}
							</header>
							<ul className="flex flex-col gap-0.5">
								{searches.map((term) => (
									<li key={term} className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => handleRecentTap(term)}
											className="hover:bg-muted/60 active:bg-muted focus-visible:ring-ring flex min-h-11 flex-1 items-center gap-3 rounded-md px-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
										>
											<Clock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
											<span className="truncate">{term}</span>
										</button>
										<button
											type="button"
											onClick={() => handleRecentRemove(term)}
											className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
											aria-label={`Retirer « ${term} » des recherches récentes`}
										>
											<X className="size-4" aria-hidden="true" />
										</button>
									</li>
								))}
							</ul>
						</section>
					)}

					<span role="status" aria-live="polite" className="sr-only">
						{isPending ? "Chargement des résultats…" : ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
