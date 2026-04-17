"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { normalizeHex } from "../utils/hex-normalizer";
import { RECENT_COLORS_MAX } from "../constants/jewelry-palette";

function readFromStorage(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEYS.RECENT_COLORS);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((v): v is string => typeof v === "string").slice(0, RECENT_COLORS_MAX);
	} catch {
		return [];
	}
}

function writeToStorage(colors: string[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(colors));
	} catch {
		// Ignore: private browsing, quota exceeded, etc.
	}
}

export function useRecentColors() {
	const [colors, setColors] = useState<string[]>([]);

	// Hydrate from localStorage after mount to avoid SSR/CSR mismatch.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- canonical post-hydration localStorage read
		setColors(readFromStorage());
	}, []);

	const add = useCallback((hex: string) => {
		const cleaned = hex.trim().replace(/^#/, "");
		if (!/^[0-9A-Fa-f]{3}$/.test(cleaned) && !/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
			return;
		}
		const normalized = normalizeHex(hex);
		setColors((prev) => {
			const filtered = prev.filter((c) => c.toUpperCase() !== normalized);
			const next = [normalized, ...filtered].slice(0, RECENT_COLORS_MAX);
			writeToStorage(next);
			return next;
		});
	}, []);

	const clear = useCallback(() => {
		setColors([]);
		writeToStorage([]);
	}, []);

	return { colors, add, clear };
}
