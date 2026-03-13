"use client";

import { useEffect, useRef, useOptimistic, useActionState, useTransition } from "react";
import { useSwipeToDismiss } from "./use-swipe-to-dismiss";
import { setAnnouncementDismissed } from "@/modules/announcements/actions/set-announcement-dismissed";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface UseAnnouncementBarOptions {
	announcementId: string;
	dismissDurationHours: number;
}

interface UseAnnouncementBarReturn {
	isDismissed: boolean;
	barRef: React.RefObject<HTMLDivElement | null>;
	dismiss: () => void;
	/** Reset CSS variable after exit animation completes. Pass to AnimatePresence onExitComplete. */
	onExitComplete: () => void;
	/** Current swipe offset in px (negative = swiping up). 0 when not swiping. */
	swipeOffset: number;
}

export function useAnnouncementBar({
	announcementId,
	dismissDurationHours,
}: UseAnnouncementBarOptions): UseAnnouncementBarReturn {
	const isDismissingRef = useRef(false);
	const barRef = useRef<HTMLDivElement>(null);

	// Optimistic state: false = not dismissed (server already filtered dismissed)
	const [optimisticDismissed, setOptimisticDismissed] = useOptimistic(false);
	const [, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(setAnnouncementDismissed, {
			onError: () => {
				// Rollback optimistic state on error
				setOptimisticDismissed(false);
			},
		}),
		undefined,
	);

	const isVisible = !optimisticDismissed;

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

		// Move focus to main content after dismiss (WCAG 2.4.3)
		requestAnimationFrame(() => {
			const mainContent = document.querySelector<HTMLElement>("#main-content");
			if (mainContent) {
				mainContent.focus({ preventScroll: true });
			} else {
				document.querySelector<HTMLElement>("nav a")?.focus({ preventScroll: true });
			}
		});

		startTransition(() => {
			setOptimisticDismissed(true);

			const formData = new FormData();
			formData.append("announcementId", announcementId);
			formData.append("dismissDurationHours", String(dismissDurationHours));
			formAction(formData);
		});
	};

	// Reset CSS variable after exit animation completes (synced with AnimatePresence)
	const onExitComplete = () => {
		document.documentElement.style.setProperty("--announcement-bar-height", "0px");
	};

	const { swipeOffset } = useSwipeToDismiss({
		elementRef: barRef,
		enabled: isVisible,
		onDismiss: dismiss,
	});

	return { isDismissed: optimisticDismissed, barRef, dismiss, onExitComplete, swipeOffset };
}
