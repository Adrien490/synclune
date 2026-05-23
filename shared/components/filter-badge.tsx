"use client";

import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";
import { m, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const ANIMATION_PROPS = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
} as const;

const DRAG_CONSTRAINTS = { left: 0, right: 0 } as const;
const DRAG_DISMISS_THRESHOLD = 80;

interface FilterBadgeProps {
	filter: FilterDefinition;
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	onRemove: (key: string, value?: string) => void;
	compactMobile?: boolean;
}

export function FilterBadge({ filter, formatFilter, onRemove, compactMobile }: FilterBadgeProps) {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	// Left-only swipe-to-dismiss (iOS convention) — right rubberband stays full-opacity by design.
	const x = useMotionValue(0);
	const dragOpacity = useTransform(
		x,
		[-DRAG_DISMISS_THRESHOLD, 0, DRAG_DISMISS_THRESHOLD],
		[0.2, 1, 1],
	);
	const dragScale = useTransform(
		x,
		[-DRAG_DISMISS_THRESHOLD, 0, DRAG_DISMISS_THRESHOLD],
		[0.92, 1, 1],
	);

	const formatted = formatFilter?.(filter);

	// If the function returns null, don't render the badge
	if (formatted === null) {
		return null;
	}

	const displayLabel = formatted?.label ?? filter.label;
	const displayValue = formatted?.displayValue ?? filter.displayValue;
	const filterDescription = `${displayLabel}${displayValue ? ` ${displayValue}` : ""}`;
	const ariaLabelRemove = `Supprimer le filtre ${filterDescription}`;

	// Parent `FilterBadges` has aria-live=polite — removal is announced via list update.
	const handleRemove = () => {
		triggerHaptic("selection");
		let value: string | undefined;

		if (typeof filter.value === "string") {
			value = filter.value;
		} else if (typeof filter.value === "number" || typeof filter.value === "boolean") {
			value = String(filter.value);
		} else if (filter.value instanceof Date) {
			value = filter.value.toISOString();
		} else if (Array.isArray(filter.value)) {
			// `useFilter` decomposes arrays into distinct entries — reaching this signals a hook contract regression.
			if (process.env.NODE_ENV !== "production") {
				throw new Error(
					`FilterBadge received an array value for key "${filter.key}". The useFilter hook should decompose arrays before rendering.`,
				);
			}
		}

		onRemove(filter.key, value);
	};

	const animationProps = shouldReduceMotion ? {} : ANIMATION_PROPS;

	const transitionProps = maybeReduceMotion(
		{
			duration: MOTION_CONFIG.duration.fast,
			ease: MOTION_CONFIG.easing.easeInOut,
		},
		shouldReduceMotion ?? false,
	);
	const enableDrag = isTouchDevice && !shouldReduceMotion;

	return (
		<m.button
			type="button"
			{...animationProps}
			transition={transitionProps}
			onClick={handleRemove}
			aria-label={ariaLabelRemove}
			drag={enableDrag ? "x" : false}
			dragConstraints={DRAG_CONSTRAINTS}
			dragElastic={0.3}
			onDragEnd={(_, info) => {
				if (info.offset.x < -DRAG_DISMISS_THRESHOLD) {
					handleRemove();
				}
			}}
			style={{
				x,
				opacity: enableDrag ? dragOpacity : undefined,
				scale: enableDrag ? dragScale : undefined,
			}}
			className={cn(
				// Layout
				"group flex items-center gap-1.5",
				"h-11 sm:h-8",
				"px-3",
				// Pill shape
				"rounded-full border",
				// Typography
				"text-sm",
				// Max width
				"max-w-70 sm:max-w-80",
				// States
				"can-hover:cursor-pointer touch-manipulation",
				"motion-safe:transition-colors motion-safe:duration-150",
				"can-hover:hover:bg-accent can-hover:hover:border-primary/40",
				// Active (mobile)
				"active:scale-[0.95] sm:active:scale-[0.98]",
				"active:bg-destructive/15 active:border-destructive/30",
				// Focus ring (SSOT — app/globals.css @utility focus-ring)
				"focus-ring",
			)}
		>
			{/* Text: label + value */}
			<span className="truncate">
				{displayValue && displayValue.length > 0 ? (
					<>
						<span
							className={cn(
								"text-muted-foreground font-normal",
								compactMobile && "hidden sm:inline",
							)}
						>
							{displayLabel} :
						</span>{" "}
						<span className="font-medium">{displayValue}</span>
					</>
				) : (
					<span className="font-medium">{displayLabel}</span>
				)}
			</span>

			{/* X opacity: full on mobile (primary affordance, no hover), dimmed-at-rest on desktop. */}
			<span
				aria-hidden="true"
				className={cn(
					"shrink-0",
					"opacity-100 sm:opacity-60",
					"can-hover:group-hover:opacity-100",
					"motion-safe:transition-opacity motion-safe:duration-150",
					"sm:flex sm:items-center sm:justify-center",
					"sm:size-5 sm:rounded-full",
					"sm:bg-destructive/10 sm:text-destructive",
				)}
			>
				<X className="size-3.5 sm:size-3" />
			</span>
		</m.button>
	);
}
