"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const MAX_ITEMS = 5;
const MAX_TERM_LENGTH = 100;
const STORAGE_PREFIX = "synclune:admin-recent-searches:";

const termSchema = z.string().trim().min(1).max(MAX_TERM_LENGTH);
const storageSchema = z.array(termSchema).max(MAX_ITEMS);

function storageKey(scope: string): string {
	return `${STORAGE_PREFIX}${scope}`;
}

function readFromStorage(scope: string): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(storageKey(scope));
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		const result = storageSchema.safeParse(parsed);
		return result.success ? result.data : [];
	} catch {
		return [];
	}
}

function writeToStorage(scope: string, searches: string[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(storageKey(scope), JSON.stringify(searches));
	} catch {
		// QuotaExceededError, private mode, etc. — silent no-op
	}
}

/**
 * Recherches récentes admin stockées en localStorage par scope (page).
 *
 * - SSR-safe : état initial `[]`, hydraté après mount
 * - Scope par page : `admin:products`, `admin:orders`, etc.
 * - Cap à 5 entrées (plus ancienne évincée)
 * - Dédupe insensible à la casse, terme stocké trimé + lowercase
 * - Robuste : JSON corrompu / QuotaExceeded / incognito → no-op silencieux
 */
export function useAdminRecentSearches(scope: string) {
	const [searches, setSearches] = useState<string[]>([]);

	useEffect(() => {
		setSearches(readFromStorage(scope));
	}, [scope]);

	const persist = useCallback(
		(next: string[]) => {
			setSearches(next);
			writeToStorage(scope, next);
		},
		[scope],
	);

	const add = useCallback(
		(term: string) => {
			const parsed = termSchema.safeParse(term.toLowerCase());
			if (!parsed.success) return;
			const normalized = parsed.data;
			setSearches((prev) => {
				const without = prev.filter((t) => t !== normalized);
				const next = [normalized, ...without].slice(0, MAX_ITEMS);
				writeToStorage(scope, next);
				return next;
			});
		},
		[scope],
	);

	const remove = useCallback(
		(term: string) => {
			const normalized = term.trim().toLowerCase();
			setSearches((prev) => {
				const next = prev.filter((t) => t !== normalized);
				writeToStorage(scope, next);
				return next;
			});
		},
		[scope],
	);

	const clear = useCallback(() => {
		persist([]);
	}, [persist]);

	const restore = useCallback(
		(snapshot: string[]) => {
			const valid = storageSchema.safeParse(snapshot);
			if (!valid.success) return;
			persist(valid.data);
		},
		[persist],
	);

	return { searches, add, remove, clear, restore };
}
