"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

const RECENT_SEARCHES_MAX_ITEMS = 5;
const RECENT_SEARCHES_MAX_TERM_LENGTH = 100;
const RECENT_SEARCHES_STORAGE_PREFIX = "synclune:admin-recent-searches:";

const recentSearchTermSchema = z.string().trim().min(1).max(RECENT_SEARCHES_MAX_TERM_LENGTH);
const recentSearchesStorageSchema = z.array(recentSearchTermSchema).max(RECENT_SEARCHES_MAX_ITEMS);

export function recentSearchesStorageKey(scope: string): string {
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

export interface UseAdminRecentSearchesReturn {
	searches: string[];
	add: (term: string) => void;
	remove: (term: string) => void;
	clear: () => void;
	restore: (snapshot: string[]) => void;
}

/**
 * localStorage-backed recent searches per admin scope.
 *
 * - max 5 items, max 100 chars per term (Zod validated)
 * - latest first (re-tap reorders to top)
 * - SSR-safe (initial state empty until effect)
 * - silent on QuotaExceeded / private mode
 */
export function useAdminRecentSearches(scope: string): UseAdminRecentSearchesReturn {
	const [searches, setSearches] = useState<string[]>([]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSearches(readRecentSearches(scope));
	}, [scope]);

	function persist(next: string[]) {
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
		persist([]);
	}

	function restore(snapshot: string[]) {
		const valid = recentSearchesStorageSchema.safeParse(snapshot);
		if (!valid.success) return;
		persist(valid.data);
	}

	return { searches, add, remove, clear, restore };
}
