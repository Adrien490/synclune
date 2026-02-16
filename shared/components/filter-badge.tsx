"use client";

import {
	MOTION_CONFIG,
	maybeReduceMotion,
} from "@/shared/components/animations/motion.config";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";
import {
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";

const ANIMATION_PROPS = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
} as const;

const ICON_VARIANTS = {
	initial: { opacity: 0.4 },
	hover: { opacity: 1 },
} as const;

const DRAG_CONSTRAINTS = { left: 0, right: 0 } as const;

interface FilterBadgeProps {
	filter: FilterDefinition;
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	onRemove: (key: string, value?: string) => void;
}

export function FilterBadge({
	filter,
	formatFilter,
	onRemove,
}: FilterBadgeProps) {
	const shouldReduceMotion = useReducedMotion();
	const isMobile = useIsMobile();

	const formatted = formatFilter?.(filter);

	// If the function returns null, don't render the badge
	if (formatted === null) {
		return null;
	}

	const displayLabel = formatted?.label || filter.label;
	const displayValue = formatted?.displayValue || filter.displayValue;
	const filterDescription = `${displayLabel}${displayValue ? ` ${displayValue}` : ""}`;
	const ariaLabelRemove = `Supprimer le filtre ${filterDescription}`;

	// Optimistic removal - instant badge disappearance
	const handleRemove = () => {
		let value: string | undefined;

		if (typeof filter.value === "string") {
			value = filter.value;
		} else if (
			typeof filter.value === "number" ||
			typeof filter.value === "boolean"
		) {
			value = String(filter.value);
		} else if (filter.value instanceof Date) {
			value = filter.value.toISOString();
		}

		onRemove(filter.key, value);
	};

	const animationProps = shouldReduceMotion ? {} : ANIMATION_PROPS;

	const transitionProps = maybeReduceMotion(
		{
			duration: MOTION_CONFIG.duration.fast,
			ease: MOTION_CONFIG.easing.easeInOut,
		},
		shouldReduceMotion ?? false
	);

	// Swipe-to-dismiss on mobile
	const x = useMotionValue(0);
	const opacity = useTransform(x, [-100, 0, 100], [0.3, 1, 0.3]);
	const enableDrag = isMobile && !shouldReduceMotion;

	return (
		<motion.button
			type="button"
			{...animationProps}
			transition={transitionProps}
			onClick={handleRemove}
			aria-label={ariaLabelRemove}
			whileHover={shouldReduceMotion ? undefined : "hover"}
			drag={enableDrag ? "x" : false}
			dragConstraints={DRAG_CONSTRAINTS}
			dragElastic={0.3}
			onDragEnd={(_, info) => {
				if (Math.abs(info.offset.x) > 80) {
					handleRemove();
				}
			}}
			style={{ x, opacity: enableDrag ? opacity : undefined }}
			className={cn(
				// Layout
				"flex items-center gap-1.5",
				"h-11 sm:h-8",
				"px-3",
				// Pill shape
				"rounded-full border",
				// Typography
				"text-sm",
				// Max width
				"max-w-70 sm:max-w-80",
				// States
				"cursor-pointer",
				"transition-colors duration-150",
				"can-hover:hover:bg-accent can-hover:hover:border-primary/40",
				// Active (mobile)
				"active:scale-[0.95] sm:active:scale-[0.98]",
				"active:bg-destructive/15 active:border-destructive/30",
				// Focus
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			)}
		>
			{/* Text: label + value */}
			<span className="truncate">
				{displayValue && displayValue.length > 0 ? (
					<>
						<span className="text-muted-foreground font-normal">
							{displayLabel} :
						</span>{" "}
						<span className="font-medium">{displayValue}</span>
					</>
				) : (
					<span className="font-medium">{displayLabel}</span>
				)}
			</span>

			{/* X icon - responsive: plain on mobile, circle on desktop */}
			<motion.span
				aria-hidden="true"
				variants={ICON_VARIANTS}
				initial="initial"
				transition={transitionProps}
				className={cn(
					"shrink-0",
					"sm:flex sm:items-center sm:justify-center",
					"sm:size-5 sm:rounded-full",
					"sm:bg-destructive/10 sm:text-destructive"
				)}
			>
				<X className="size-3.5 sm:size-3" />
			</motion.span>
		</motion.button>
	);
}
