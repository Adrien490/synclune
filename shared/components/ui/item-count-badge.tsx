"use client";

import { Badge } from "@/shared/components/ui/badge";
import { usePulseOnChange } from "@/shared/hooks";
import { cn } from "@/shared/utils/cn";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

const itemCountBadgeVariants = cva(
	"flex items-center justify-center p-0 font-bold bg-secondary text-secondary-foreground shadow-lg animate-in zoom-in-50 duration-300",
	{
		variants: {
			size: {
				sm: "h-5 w-5 text-[10px] border-2 border-secondary",
				default: "h-[22px] w-[22px] text-[11px] border-2 border-background ring-2 ring-background",
			},
		},
		defaultVariants: {
			size: "default",
		},
	}
);

export interface ItemCountBadgeProps extends VariantProps<typeof itemCountBadgeVariants> {
	/** The count to display */
	count: number;
	/** Singular label for aria announcement (e.g., "article dans ton panier") */
	singularLabel: string;
	/** Plural label for aria announcement (e.g., "articles dans ton panier") */
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
	const shouldPulse = usePulseOnChange(count);

	// Don't render if count is 0 or negative
	if (!count || count <= 0) {
		return null;
	}

	// Clamp to 99+ to avoid visual overflow
	const displayCount = count > 99 ? "99+" : count;

	return (
		<>
			{/* aria-live announcement for screen readers */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`}
			</div>

			<div className={positionClassName}>
				<Badge
					className={cn(
						itemCountBadgeVariants({ size }),
						shouldPulse && "animate-badge-pulse",
						className
					)}
					aria-hidden="true"
				>
					{displayCount}
				</Badge>
			</div>
		</>
	);
}
