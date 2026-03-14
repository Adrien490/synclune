"use client";

import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { isSafeLink } from "./announcement-bar.constants";
import { useAnnouncementBar } from "./use-announcement-bar";

export interface AnnouncementBarProps {
	message: string;
	link?: string;
	linkText?: string;
	/** Announcement ID used as cookie key */
	announcementId: string;
	/** Hours before the banner can reappear after dismissal */
	dismissDurationHours: number;
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
}: AnnouncementBarProps) {
	const prefersReducedMotion = useReducedMotion();
	const { isDismissed, barRef, dismiss, onExitComplete, swipeOffset } = useAnnouncementBar({
		announcementId,
		dismissDurationHours,
	});

	const springTransition = maybeReduceMotion(MOTION_CONFIG.spring.bar, !!prefersReducedMotion);

	// Validate link prop
	const safeLink = link && isSafeLink(link) ? link : undefined;

	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{!isDismissed && (
				<m.div
					ref={barRef}
					role="region"
					aria-label="Barre d'annonce promotionnelle"
					initial={prefersReducedMotion ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
					animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
					exit={prefersReducedMotion ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
					transition={springTransition}
					{...(swipeOffset < 0 && {
						style: {
							transform: `translateY(${swipeOffset}px)`,
							opacity: Math.max(0, 1 + swipeOffset / 60),
						},
					})}
					// Scope Escape key to the bar
					onKeyDown={(e) => {
						if (e.key === "Escape") dismiss();
					}}
					className={cn(
						"fixed inset-x-0 top-0 z-50",
						"h-[var(--ab-height)]",
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
							"relative line-clamp-1 flex items-center gap-2 text-center",
							"pl-[max(2.5rem,env(safe-area-inset-left))]",
							"pr-[max(2.5rem,env(safe-area-inset-right))]",
						)}
					>
						<span aria-hidden="true" className="animate-sparkle-pulse">
							&#10022;
						</span>
						<span>{message}</span>
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
						<span aria-hidden="true" className="animate-sparkle-pulse">
							&#10022;
						</span>
					</div>

					<button
						type="button"
						onClick={dismiss}
						className="hover:bg-primary-foreground/15 focus-visible:ring-primary-foreground absolute top-1/2 right-2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-hidden sm:right-3"
						aria-label="Fermer la barre d'annonce"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</m.div>
			)}
		</AnimatePresence>
	);
}
