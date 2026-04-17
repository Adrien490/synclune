"use client";

import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import {
	COUNTDOWN_DISPLAY_THRESHOLD_MS,
	isSafeLink,
	SWIPE_DISMISS_THRESHOLD,
} from "./announcement-bar.constants";
import { useAnnouncementBar } from "./use-announcement-bar";
import { useCountdown } from "./use-countdown";

export interface AnnouncementBarProps {
	message: string;
	link?: string;
	linkText?: string;
	/** Announcement ID used as cookie key */
	announcementId: string;
	/** Hours before the banner can reappear after dismissal */
	dismissDurationHours: number;
	/** Optional end date — when within COUNTDOWN_DISPLAY_THRESHOLD, a countdown pill is shown */
	endsAt?: Date | null;
}

/**
 * Dismissible promotional banner displayed above the navbar.
 *
 * - Persists dismiss state via httpOnly cookie with expiry (server action)
 * - Server wrapper skips render entirely when cookie exists (zero JS, zero flash)
 * - Sets --announcement-bar-height CSS variable on <html> for navbar offset
 * - Shimmer background on bg-primary
 * - Swipe up to dismiss on mobile (touch gesture)
 * - Accessible: role="region", Escape dismiss (scoped), 44px touch targets
 */
export function AnnouncementBar({
	message,
	link,
	linkText,
	announcementId,
	dismissDurationHours,
	endsAt = null,
}: AnnouncementBarProps) {
	const { isDismissed, barRef, dismiss, onExitComplete, swipeOffset, isSwiping } =
		useAnnouncementBar({
			announcementId,
			dismissDurationHours,
		});
	const prefersReducedMotion = useReducedMotion();

	// Validate link prop
	const safeLink = link && isSafeLink(link) ? link : undefined;

	const countdown = useCountdown(endsAt, COUNTDOWN_DISPLAY_THRESHOLD_MS);

	const handleClose = () => {
		triggerHaptic("light");
		dismiss();
	};

	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{!isDismissed && (
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
									// Smooth spring-back when finger released but threshold not reached.
									// Skipped under reduced-motion (WCAG 2.3.3).
									...(!isSwiping && !prefersReducedMotion
										? { transition: "transform 150ms ease-out, opacity 150ms ease-out" }
										: {}),
								}
							: {}),
					}}
					// Scope Escape key to the bar
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
					{/* Shimmer sweep effect */}
					<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
					</div>

					<div
						className={cn(
							"relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center",
							"pl-[max(2.5rem,env(safe-area-inset-left))]",
							"pr-[max(2.5rem,env(safe-area-inset-right))]",
						)}
					>
						<span className="line-clamp-2 sm:line-clamp-1">{message}</span>
						{safeLink && linkText && (
							<>
								<span aria-hidden="true" className="text-primary-foreground/50">
									&middot;
								</span>
								<Link
									href={safeLink}
									aria-label={`${linkText} - ${message}`}
									className="duration-fast font-semibold underline underline-offset-2 transition-[text-decoration] hover:no-underline"
								>
									{linkText}
								</Link>
							</>
						)}
					</div>

					{countdown ? (
						<span
							role="timer"
							aria-live="off"
							aria-label={`Offre se termine dans ${countdown.label}`}
							className={cn(
								"absolute top-1/2 right-14 hidden -translate-y-1/2 items-center gap-1 rounded-full px-2 py-0.5 sm:right-16",
								"bg-primary-foreground/20 text-primary-foreground",
								"font-mono text-[11px] font-semibold tracking-wider tabular-nums",
								"xs:inline-flex",
							)}
						>
							{countdown.label}
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
