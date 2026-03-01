"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { SortOption } from "@/shared/types/sort.types";
import { cn } from "@/shared/utils/cn";
import { SortDrawer } from "./sort-drawer";

interface SortDrawerTriggerProps {
	/** Available sort options */
	options: SortOption[];
	/** URL parameter key for sort */
	filterKey?: string;
	/** Additional CSS classes for the trigger button */
	className?: string;
	/** Show reset option to clear sort */
	showResetOption?: boolean;
}

/**
 * Icon button trigger for SortDrawer.
 * Combines the trigger button and drawer in a single component.
 *
 * @example
 * ```tsx
 * <SortDrawerTrigger
 *   options={[
 *     { value: "price-ascending", label: "Prix croissant" },
 *     { value: "price-descending", label: "Prix décroissant" },
 *   ]}
 *   showResetOption
 *   className="sm:hidden"
 * />
 * ```
 */
export function SortDrawerTrigger({
	options,
	filterKey = "sortBy",
	className,
	showResetOption = false,
}: SortDrawerTriggerProps) {
	const [open, setOpen] = useState(false);
	const searchParams = useSearchParams();
	const hasActiveSort = searchParams.has(filterKey);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				className={cn("relative size-11", className)}
				aria-label="Trier"
			>
				<ArrowUpDown className="size-5" />
				{hasActiveSort && (
					<span
						className="bg-primary ring-background absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2"
						aria-hidden="true"
					/>
				)}
			</Button>

			<SortDrawer
				open={open}
				onOpenChange={setOpen}
				options={options}
				filterKey={filterKey}
				showResetOption={showResetOption}
			/>
		</>
	);
}
