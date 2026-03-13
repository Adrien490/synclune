"use client";

import { useState, useEffect, useRef } from "react";
import { STORAGE_PREFIX, EXIT_ANIMATION_DURATION, simpleHash } from "./announcement-bar.constants";
import { useSwipeToDismiss } from "./use-swipe-to-dismiss";

interface UseAnnouncementBarOptions {
	message: string;
	storageKey: string;
	dismissDurationHours: number;
}

interface UseAnnouncementBarReturn {
	isVisible: boolean;
	barRef: React.RefObject<HTMLDivElement | null>;
	dismiss: () => void;
	/** Current swipe offset in px (negative = swiping up). 0 when not swiping. */
	swipeOffset: number;
}

export function useAnnouncementBar({
	message,
	storageKey,
	dismissDurationHours,
}: UseAnnouncementBarOptions): UseAnnouncementBarReturn {
	const [isVisible, setIsVisible] = useState(false);
	const isDismissingRef = useRef(false);
	const barRef = useRef<HTMLDivElement>(null);

	const fullKey = `${STORAGE_PREFIX}${storageKey}-${simpleHash(message)}`;

	// Check localStorage for dismiss state
	useEffect(() => {
		try {
			const stored = localStorage.getItem(fullKey);
			if (stored) {
				const expiry = Number(stored);
				if (Date.now() < expiry) {
					return;
				}
				localStorage.removeItem(fullKey);
			}
		} catch {
			// localStorage unavailable
		}
		queueMicrotask(() => setIsVisible(true));
	}, [fullKey]);

	// Set CSS variable for navbar offset (with safe-area)
	useEffect(() => {
		if (isVisible) {
			document.documentElement.style.setProperty(
				"--announcement-bar-height",
				"calc(var(--ab-height) + env(safe-area-inset-top, 0px))",
			);
		}
	}, [isVisible]);

	// Reset CSS variable on unmount only (not on dismiss - dismiss handles its own timing)
	useEffect(() => {
		return () => {
			if (!isDismissingRef.current) {
				document.documentElement.style.setProperty("--announcement-bar-height", "0px");
			}
		};
	}, []);

	const dismiss = () => {
		isDismissingRef.current = true;
		setIsVisible(false);

		// Delay CSS variable reset to sync with exit animation
		setTimeout(() => {
			document.documentElement.style.setProperty("--announcement-bar-height", "0px");
		}, EXIT_ANIMATION_DURATION);

		// Move focus to main content after dismiss (C2 - WCAG 2.4.3)
		requestAnimationFrame(() => {
			const nextFocus = document.querySelector<HTMLElement>("#main-content, nav a");
			nextFocus?.focus({ preventScroll: true });
		});

		try {
			const expiry = Date.now() + dismissDurationHours * 60 * 60 * 1000;
			localStorage.setItem(fullKey, String(expiry));
		} catch {
			// localStorage unavailable
		}
	};

	const { swipeOffset } = useSwipeToDismiss({
		elementRef: barRef,
		enabled: isVisible,
		onDismiss: dismiss,
	});

	return { isVisible, barRef, dismiss, swipeOffset };
}
