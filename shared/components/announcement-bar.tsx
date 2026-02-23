"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import {
	MOTION_CONFIG,
	maybeReduceMotion,
} from "@/shared/components/animations/motion.config";

interface AnnouncementBarProps {
	message: string;
	link?: string;
	linkText?: string;
	/** localStorage key for dismiss state */
	storageKey?: string;
	/** Hours before the banner can reappear after dismissal */
	dismissDurationHours?: number;
}

const STORAGE_PREFIX = "synclune-announcement-";
const EXIT_ANIMATION_DURATION = 350;

/** Simple string hash for versioning storageKey with message content */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash).toString(36);
}

/** Validate that a link is a safe relative or https URL */
function isSafeLink(href: string): boolean {
	return href.startsWith("/") || href.startsWith("https://");
}

/**
 * Dismissible promotional banner displayed above the navbar.
 *
 * - Persists dismiss state in localStorage with expiry (key versioned by message hash)
 * - Sets --announcement-bar-height CSS variable on <html> for navbar offset
 * - Shimmer background on bg-primary
 * - Accessible: role="region", Escape dismiss (scoped), 44px touch targets
 */
export function AnnouncementBar({
	message,
	link,
	linkText,
	storageKey = "default",
	dismissDurationHours = 24,
}: AnnouncementBarProps) {
	const [isVisible, setIsVisible] = useState(false);
	const prefersReducedMotion = useReducedMotion();
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
		setIsVisible(true);
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
				document.documentElement.style.setProperty(
					"--announcement-bar-height",
					"0px",
				);
			}
		};
	}, []);

	const dismiss = () => {
		isDismissingRef.current = true;
		setIsVisible(false);

		// Delay CSS variable reset to sync with exit animation
		setTimeout(() => {
			document.documentElement.style.setProperty(
				"--announcement-bar-height",
				"0px",
			);
		}, EXIT_ANIMATION_DURATION);

		// Move focus to main content after dismiss (C2 - WCAG 2.4.3)
		requestAnimationFrame(() => {
			const nextFocus = document.querySelector<HTMLElement>(
				"#main-content, nav a",
			);
			nextFocus?.focus({ preventScroll: true });
		});

		try {
			const expiry = Date.now() + dismissDurationHours * 60 * 60 * 1000;
			localStorage.setItem(fullKey, String(expiry));
		} catch {
			// localStorage unavailable
		}
	};

	const springTransition = maybeReduceMotion(
		MOTION_CONFIG.spring.bar,
		!!prefersReducedMotion,
	);

	// Validate link prop (N4)
	const safeLink = link && isSafeLink(link) ? link : undefined;

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					ref={barRef}
					role="region"
					aria-label="Barre d'annonce promotionnelle"
					initial={
						prefersReducedMotion
							? { opacity: 0 }
							: { y: "-100%", opacity: 0 }
					}
					animate={
						prefersReducedMotion
							? { opacity: 1 }
							: { y: 0, opacity: 1 }
					}
					exit={
						prefersReducedMotion
							? { opacity: 0 }
							: { y: "-100%", opacity: 0 }
					}
					transition={springTransition}
					// P4: Scope Escape key to the bar
					onKeyDown={(e) => {
						if (e.key === "Escape") dismiss();
					}}
					className={cn(
						"fixed top-0 inset-x-0 z-50",
						"h-[var(--ab-height)]",
						"flex items-center justify-center",
						"bg-primary text-primary-foreground",
						"text-sm font-medium tracking-wide",
						"pt-[env(safe-area-inset-top)]",
						"overflow-hidden",
					)}
				>
					{/* Shimmer sweep effect */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 overflow-hidden"
					>
						<div className="absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
					</div>

					<div
						className={cn(
							"relative flex items-center gap-2 text-center line-clamp-1",
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
								<span
									aria-hidden="true"
									className="text-primary-foreground/50"
								>
									&middot;
								</span>
								<Link
									href={safeLink}
									aria-label={`${linkText} - ${message}`}
									className="underline underline-offset-2 font-semibold hover:no-underline transition-[text-decoration] duration-fast"
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
						className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-primary-foreground/15 transition-colors"
						aria-label="Fermer la barre d'annonce"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
