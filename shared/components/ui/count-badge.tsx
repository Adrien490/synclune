"use client";

import { cn } from "@/shared/utils/cn";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Pulse duration kept in sync with `@keyframes badge-pulse` in app/styles/animations.css.
 */
const PULSE_DURATION_MS = 300;

/**
 * Floating "+N" flash duration after a positive bump (cart add, wishlist add).
 */
const FLASH_DURATION_MS = 800;

const countBadgeVariants = cva(
	[
		"flex items-center justify-center font-bold leading-none tabular-nums",
		"bg-primary text-primary-foreground",
		"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
	],
	{
		variants: {
			size: {
				sm: "min-w-4 h-4 px-1 text-2xs rounded-full",
				md: "size-5 px-0.5 text-2xs rounded-full",
				lg: "min-w-[22px] h-[22px] px-1 text-2xs rounded-full",
			},
			type: {
				count: "",
				dot: "size-2 min-w-0 p-0 rounded-full",
			},
			variant: {
				raised: "ring-2 ring-background shadow-sm",
				inline: "",
			},
		},
		compoundVariants: [{ type: "dot", class: "px-0" }],
		defaultVariants: {
			size: "md",
			type: "count",
			variant: "raised",
		},
	},
);

interface CountBadgeProps extends VariantProps<typeof countBadgeVariants> {
	/** Numeric count to display. Badge is hidden when count <= 0. */
	count: number;
	/** Singular label suffix for aria announcement (e.g. "article dans votre panier"). */
	singularLabel: string;
	/** Plural label suffix for aria announcement (e.g. "articles dans votre panier"). */
	pluralLabel: string;
	/** Wrapper position class. Defaults to absolute top-right corner. */
	positionClassName?: string;
	/**
	 * Bump key — changes on every optimistic mutation to trigger flash "+N".
	 * Pass `null`/`undefined` to disable flash entirely.
	 */
	bumpKey?: number | null;
	/** Bump delta to display in the flash bubble (positive only renders). */
	bumpDelta?: number | null;
	/**
	 * Skip the internal sr-only live region. Use when the parent (e.g. bottom
	 * bar) already maintains a single combined announcement to avoid duplicates.
	 */
	silentLiveRegion?: boolean;
	className?: string;
}

/**
 * Unified count badge — SSOT for cart/wishlist counters across header desktop,
 * mobile bottom bar, and menu sheet.
 *
 * - Hidden when `count <= 0` with exit fade+scale animation.
 * - `type="dot"` renders a colorblock-only indicator (no number, smaller).
 * - `variant="inline"` removes ring+shadow for flow contexts (menu sheet).
 * - `bumpKey` + positive `bumpDelta` displays a floating "+N" flash.
 * - Pulses (CSS keyframe) on count change.
 * - Respects `prefers-reduced-motion` (skips pulse, exit anim, flash).
 */
export function CountBadge({
	count,
	singularLabel,
	pluralLabel,
	size,
	type,
	variant,
	positionClassName = "absolute -top-1 -right-1",
	bumpKey,
	bumpDelta,
	silentLiveRegion = false,
	className,
}: CountBadgeProps) {
	const prefersReducedMotion = useReducedMotion();

	const [shouldPulse, setShouldPulse] = useState(false);
	const [pulseKey, setPulseKey] = useState(0);
	const [prevCount, setPrevCount] = useState(count);
	if (prevCount !== count) {
		setPrevCount(count);
		if (!prefersReducedMotion) {
			setShouldPulse(true);
			setPulseKey((k) => k + 1);
		}
	}
	useEffect(() => {
		if (!shouldPulse) return;
		const t = setTimeout(() => setShouldPulse(false), PULSE_DURATION_MS);
		return () => clearTimeout(t);
	}, [shouldPulse, pulseKey]);

	const visible = count > 0;
	const displayCount = count > 99 ? "99+" : count;
	const showDot = type === "dot";

	const flashEligible =
		!prefersReducedMotion &&
		!showDot &&
		typeof bumpKey === "number" &&
		typeof bumpDelta === "number" &&
		bumpDelta > 0;

	return (
		<>
			{/*
			 * Région montée dès le premier rendu, texte vide quand `count === 0`.
			 *
			 * ⚠️ NE PAS remettre `&& visible` : une région `aria-live` n'est vocalisée
			 * que si elle existait déjà dans l'arbre d'accessibilité au moment où son
			 * contenu change. Gatée sur `visible`, elle disparaissait à 0 et
			 * remontait avec son texte au premier article — donc le **premier** ajout
			 * au panier ou aux favoris n'était jamais annoncé, précisément la
			 * transition qui compte. `CartBadge` et `WishlistBadge` montent
			 * `CountBadge` en permanence, la garantie tient donc de bout en bout.
			 */}
			{!silentLiveRegion && (
				<span aria-live="polite" aria-atomic="true" className="sr-only">
					{visible ? (count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`) : ""}
				</span>
			)}

			<span className={positionClassName}>
				<AnimatePresence initial={false} mode="wait">
					{visible && (
						<m.span
							key="badge"
							{...(prefersReducedMotion
								? {}
								: {
										initial: { scale: 0, opacity: 0 },
										animate: { scale: 1, opacity: 1 },
										exit: { scale: 0, opacity: 0 },
										transition: { type: "spring", stiffness: 500, damping: 28 },
									})}
							className={cn(
								countBadgeVariants({ size, type, variant }),
								shouldPulse && "animate-badge-pulse",
								className,
							)}
							aria-hidden="true"
						>
							{!showDot && displayCount}
						</m.span>
					)}
				</AnimatePresence>

				{flashEligible && (
					<m.span
						key={bumpKey}
						initial={{ y: 0, opacity: 0, scale: 0.6 }}
						animate={{ y: -14, opacity: [0, 1, 1, 0], scale: 1 }}
						transition={{ duration: FLASH_DURATION_MS / 1000, ease: "easeOut" }}
						className={cn(
							"bg-primary text-primary-foreground",
							"text-2xs rounded-full px-1.5 py-0.5 font-bold",
							"ring-background shadow-sm ring-2",
							"pointer-events-none absolute -top-2 right-0 whitespace-nowrap",
							"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
						)}
						aria-hidden="true"
					>
						+{bumpDelta}
					</m.span>
				)}
			</span>
		</>
	);
}
