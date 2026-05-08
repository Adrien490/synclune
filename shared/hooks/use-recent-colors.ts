"use client";

import { useEffect, useState } from "react";

const MAX_RECENTS = 5;
const HEX_FULL_REGEX = /^#[0-9A-Fa-f]{6}$/;

function readStorage(key: string): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const seen = new Set<string>();
		const out: string[] = [];
		for (const v of parsed) {
			if (typeof v !== "string") continue;
			if (!HEX_FULL_REGEX.test(v)) continue;
			const upper = v.toUpperCase();
			if (seen.has(upper)) continue;
			seen.add(upper);
			out.push(upper);
			if (out.length === MAX_RECENTS) break;
		}
		return out;
	} catch {
		return [];
	}
}

function writeStorage(key: string, hexes: string[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(hexes));
	} catch {
		// quota exceeded or storage disabled (private mode) → silent
	}
}

export type UseRecentColorsResult = {
	recents: string[];
	push: (hex: string) => void;
};

/**
 * Persists a small LIFO list of recently used hex colors in localStorage.
 *
 * - Keys are caller-scoped (e.g. "synclune:admin:recent-colors").
 * - Capped to 5 entries, dedup case-insensitive (uppercase canonical form).
 * - SSR-safe (initial state empty, hydrates in useEffect).
 * - Cross-tab sync via the native `storage` event.
 *
 * Pass `undefined` as key to disable (returns a stable no-op push).
 */
const noopPush = () => {};

export function useRecentColors(key: string | undefined): UseRecentColorsResult {
	const [recents, setRecents] = useState<string[]>([]);

	useEffect(() => {
		if (!key) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount; SSR-safe pattern
		setRecents(readStorage(key));

		const onStorage = (event: StorageEvent) => {
			if (event.key !== key) return;
			if (event.storageArea && event.storageArea !== window.localStorage) return;
			setRecents(readStorage(key));
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [key]);

	if (!key) {
		return { recents: [], push: noopPush };
	}

	const push = (hex: string) => {
		if (!HEX_FULL_REGEX.test(hex)) return;
		const upper = hex.toUpperCase();
		setRecents((prev) => {
			const filtered = prev.filter((h) => h !== upper);
			const next = [upper, ...filtered].slice(0, MAX_RECENTS);
			writeStorage(key, next);
			return next;
		});
	};

	return { recents, push };
}
