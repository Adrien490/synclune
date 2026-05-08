"use client";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribePrefersReducedMotion(callback: () => void) {
	const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
	mql.addEventListener("change", callback);
	return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
	return false;
}

const PULSE_DURATION_MS = 600;

const itemCountBadgeVariants = cva(
	"flex items-center justify-center p-0 font-bold bg-primary text-primary-foreground shadow-lg animate-in zoom-in-50 duration-300 border-2 border-background",
	{
		variants: {
			size: {
				sm: "size-5 text-[10px]",
				default: "size-[22px] text-[11px]",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

interface ItemCountBadgeProps extends VariantProps<typeof itemCountBadgeVariants> {
	/** The count to display */
	count: number;
	/** Singular label for aria announcement (e.g., "article dans votre panier") */
	singularLabel: string;
	/** Plural label for aria announcement (e.g., "articles dans votre panier") */
	pluralLabel: string;
	/** Additional class names */
	className?: string;
	/** Position class (default: absolute -top-1 -right-1) */
	positionClassName?: string;
}

/**
 * Item count badge with pulse animation on change and aria-live announcements.
 *
 * Used for cart and wishlist badges that show item counts with
 * visual feedback when the count changes.
 */
export function ItemCountBadge({
	count,
	singularLabel,
	pluralLabel,
	size,
	className,
	positionClassName = "absolute -top-1 -right-1",
}: ItemCountBadgeProps) {
	const [shouldPulse, setShouldPulse] = useState(false);
	const [pulseKey, setPulseKey] = useState(0);
	const prefersReducedMotion = useSyncExternalStore(
		subscribePrefersReducedMotion,
		getReducedMotionSnapshot,
		getReducedMotionServerSnapshot,
	);

	const [prevCount, setPrevCount] = useState(count);
	if (prevCount !== count) {
		setPrevCount(count);
		if (!prefersReducedMotion) {
			setShouldPulse(true);
			setPulseKey(pulseKey + 1);
		}
	}

	useEffect(() => {
		if (!shouldPulse) return;
		const timeout = setTimeout(() => setShouldPulse(false), PULSE_DURATION_MS);
		return () => clearTimeout(timeout);
	}, [shouldPulse, pulseKey]);

	// Don't render if count is 0 or negative
	if (!count || count <= 0) {
		return null;
	}

	// Clamp to 99+ to avoid visual overflow
	const displayCount = count > 99 ? "99+" : count;

	return (
		<>
			{/* aria-live announcement for screen readers */}
			<span aria-live="polite" aria-atomic="true" className="sr-only">
				{count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`}
			</span>

			<span className={positionClassName}>
				<Badge
					className={cn(
						itemCountBadgeVariants({ size }),
						shouldPulse && "animate-badge-pulse",
						className,
					)}
					aria-hidden="true"
				>
					{displayCount}
				</Badge>
			</span>
		</>
	);
}
