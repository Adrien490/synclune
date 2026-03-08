"use client";

import { useSyncExternalStore } from "react";

interface ShareData {
	title: string;
	text?: string;
	url: string;
}

function subscribeNoop(callback: () => void) {
	return () => {};
}

function getCanShareSnapshot() {
	return "share" in navigator;
}

function getCanShareServerSnapshot() {
	return false;
}

/**
 * Hook for the Web Share API with feature detection.
 * Falls back to clipboard copy when Web Share is unavailable.
 */
export function useWebShare() {
	const canShare = useSyncExternalStore(
		subscribeNoop,
		getCanShareSnapshot,
		getCanShareServerSnapshot,
	);

	async function share(data: ShareData): Promise<"shared" | "copied" | "dismissed"> {
		if (canShare) {
			try {
				await navigator.share(data);
				return "shared";
			} catch (err) {
				// User cancelled the share dialog
				if (err instanceof Error && err.name === "AbortError") {
					return "dismissed";
				}
				// Fallback to clipboard on other errors
			}
		}

		// Fallback: copy URL to clipboard
		try {
			await navigator.clipboard.writeText(data.url);
			return "copied";
		} catch {
			return "dismissed";
		}
	}

	return { canShare, share };
}
