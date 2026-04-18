"use client";

import { useSyncExternalStore } from "react";

interface ShareData {
	title: string;
	text?: string;
	url: string;
}

function subscribeNoop(_callback: () => void) {
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
		// Validate URL early — navigator.share() rejects silently on malformed URLs,
		// which then falls back to clipboard and writes garbage data.
		try {
			new URL(data.url);
		} catch {
			return "dismissed";
		}

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
