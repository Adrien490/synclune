"use client";

import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { dismissAnnouncement } from "@/shared/actions/dismiss-announcement";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { isSafeStorefrontLink } from "@/shared/utils/is-safe-storefront-link";
import { withCallbacks } from "@/shared/utils/with-callbacks";

const SWIPE_DISMISS_THRESHOLD = 30;
const COUNTDOWN_DISPLAY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface AnnouncementBarProps {
	message: string;
	link: string | null;
	endsAt: Date | null;
	/** 16-char stable hash of the message — keys the dismiss cookie */
	hash: string;
}

function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function AnnouncementBar({ message, link, endsAt, hash }: AnnouncementBarProps) {
	const prefersReducedMotion = useReducedMotion();
	const barRef = useRef<HTMLDivElement>(null);
	const isDismissingRef = useRef(false);

	const [optimisticDismissed, setOptimisticDismissed] = useOptimistic(false);
	const [, startTransition] = useTransition();
	const [, formAction] = useActionState(
		withCallbacks(dismissAnnouncement, {
			onError: () => setOptimisticDismissed(false),
		}),
		undefined,
	);

	const isVisible = !optimisticDismissed;

	useEffect(() => {
		if (isVisible) {
			document.documentElement.style.setProperty(
				"--announcement-bar-height",
				"calc(var(--ab-height) + env(safe-area-inset-top, 0px))",
			);
		}
	}, [isVisible]);

	useEffect(() => {
		return () => {
			if (!isDismissingRef.current) {
				document.documentElement.style.setProperty("--announcement-bar-height", "0px");
			}
		};
	}, []);

	const dismiss = () => {
		isDismissingRef.current = true;
		startTransition(() => {
			setOptimisticDismissed(true);
			const fd = new FormData();
			fd.append("hash", hash);
			formAction(fd);
		});
	};

	const onExitComplete = () => {
		document.documentElement.style.setProperty("--announcement-bar-height", "0px");
		const mainContent = document.querySelector<HTMLElement>("#main-content");
		if (mainContent) {
			mainContent.focus({ preventScroll: true });
		}
	};

	const { swipeOffset, isSwiping } = useSwipeToDismiss(barRef, isVisible, dismiss);
	const countdownLabel = useCountdownLabel(endsAt, COUNTDOWN_DISPLAY_THRESHOLD_MS);

	const safeLink = link && isSafeStorefrontLink(link) ? link : null;

	const handleClose = () => {
		triggerHaptic("light");
		dismiss();
	};

	const content = <span className="line-clamp-2 sm:line-clamp-1">{message}</span>;

	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{!optimisticDismissed && (
				<m.div
					ref={barRef}
					role="region"
					aria-label="Barre d'annonce promotionnelle"
					initial={{ y: "-100%", opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: "-100%", opacity: 0 }}
					transition={MOTION_CONFIG.spring.bar}
					style={{
						viewTransitionName: "announcement-bar",
						...(swipeOffset < 0
							? {
									transform: `translateY(${swipeOffset}px)`,
									opacity: Math.max(0, 1 + swipeOffset / SWIPE_DISMISS_THRESHOLD),
									...(!isSwiping && !prefersReducedMotion
										? { transition: "transform 150ms ease-out, opacity 150ms ease-out" }
										: {}),
								}
							: {}),
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") dismiss();
					}}
					className={cn(
						"fixed inset-x-0 top-0 z-50",
						"h-(--ab-height)",
						"flex items-center justify-center",
						"bg-primary text-primary-foreground",
						"text-sm font-medium tracking-wide",
						"pt-[env(safe-area-inset-top)]",
						"overflow-hidden",
					)}
				>
					<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
					</div>

					{safeLink ? (
						<Link
							href={safeLink}
							aria-label={message}
							className={cn(
								"relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center",
								"pl-[max(2.5rem,env(safe-area-inset-left))]",
								"pr-[max(2.5rem,env(safe-area-inset-right))]",
								"duration-fast underline underline-offset-2 transition-[text-decoration] hover:no-underline",
							)}
						>
							{content}
						</Link>
					) : (
						<div
							className={cn(
								"relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center",
								"pl-[max(2.5rem,env(safe-area-inset-left))]",
								"pr-[max(2.5rem,env(safe-area-inset-right))]",
							)}
						>
							{content}
						</div>
					)}

					{countdownLabel ? (
						<span
							role="timer"
							aria-live="off"
							aria-label={`Offre se termine dans ${countdownLabel}`}
							className={cn(
								"absolute top-1/2 right-14 hidden -translate-y-1/2 items-center gap-1 rounded-full px-2 py-0.5 sm:right-16",
								"bg-primary-foreground/20 text-primary-foreground",
								"font-mono text-[11px] font-semibold tracking-wider tabular-nums",
								"xs:inline-flex",
							)}
						>
							{countdownLabel}
						</span>
					) : null}

					<button
						type="button"
						onClick={handleClose}
						className="hover:bg-primary-foreground/15 focus-visible:ring-primary-foreground absolute top-1/2 right-2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-hidden motion-safe:active:scale-95 sm:right-3"
						aria-label="Fermer la barre d'annonce"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</m.div>
			)}
		</AnimatePresence>
	);
}

function useSwipeToDismiss(
	elementRef: React.RefObject<HTMLElement | null>,
	enabled: boolean,
	onDismiss: () => void,
) {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);
	const touchStartYRef = useRef<number | null>(null);
	const swipeOffsetRef = useRef(0);
	const onDismissRef = useRef(onDismiss);

	useEffect(() => {
		swipeOffsetRef.current = swipeOffset;
	}, [swipeOffset]);

	useEffect(() => {
		onDismissRef.current = onDismiss;
	}, [onDismiss]);

	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled) return;

		function onTouchStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			touchStartYRef.current = touch.clientY;
			setIsSwiping(true);
		}

		function onTouchMove(e: TouchEvent) {
			const touch = e.touches[0];
			if (touchStartYRef.current === null || !touch) return;
			const deltaY = touch.clientY - touchStartYRef.current;
			setSwipeOffset(Math.min(0, deltaY));
		}

		function onTouchEnd() {
			if (touchStartYRef.current === null) return;
			touchStartYRef.current = null;
			setIsSwiping(false);
			if (swipeOffsetRef.current < -SWIPE_DISMISS_THRESHOLD) {
				triggerHaptic("medium");
				onDismissRef.current();
			}
			setSwipeOffset(0);
		}

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });
		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}, [elementRef, enabled]);

	return { swipeOffset, isSwiping };
}

function useCountdownLabel(target: Date | null, thresholdMs: number): string | null {
	const targetMs = target ? target.getTime() : null;
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		if (targetMs === null) return;
		const tick = () => setNow(Date.now());
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [targetMs]);

	if (targetMs === null || now === null) return null;
	const remaining = targetMs - now;
	if (remaining <= 0 || remaining > thresholdMs) return null;
	return formatRemaining(remaining);
}
