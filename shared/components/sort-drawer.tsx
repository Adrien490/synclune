"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/utils/cn";

export interface SortOption {
	value: string;
	label: string;
}

interface SortDrawerProps {
	/** Controlled open state */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** Available sort options */
	options: SortOption[];
	/** URL parameter key for sort (will be prefixed with filter_) */
	filterKey?: string;
	/** Title displayed in drawer header */
	title?: string;
	/** Auto-close drawer after selection */
	autoCloseOnSelect?: boolean;
}

/**
 * Bottom drawer for sort options on mobile.
 * Displays radio-style options and updates URL params on selection.
 *
 * @example
 * ```tsx
 * const [sortOpen, setSortOpen] = useState(false);
 *
 * <SortDrawer
 *   open={sortOpen}
 *   onOpenChange={setSortOpen}
 *   options={[
 *     { value: "price-ascending", label: "Prix croissant" },
 *     { value: "price-descending", label: "Prix decroissant" },
 *     { value: "created-descending", label: "Plus recents" },
 *   ]}
 * />
 * ```
 */
export function SortDrawer({
	open,
	onOpenChange,
	options,
	filterKey = "sortBy",
	title = "Trier par",
	autoCloseOnSelect = true,
}: SortDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// URL parameter key with filter prefix
	const paramKey = `filter_${filterKey}`;

	// Get current value from URL
	const currentValue = searchParams.get(paramKey) || "";

	// Optimistic state for immediate UI feedback
	const [optimisticValue, setOptimisticValue] =
		useOptimistic<string>(currentValue);

	// Handle option selection
	const handleSelect = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());

		// Update or remove the parameter
		if (value && value !== optimisticValue) {
			params.set(paramKey, value);
		} else if (!value) {
			params.delete(paramKey);
		}

		// Reset pagination
		params.delete("cursor");
		params.delete("direction");
		params.set("page", "1");

		startTransition(() => {
			setOptimisticValue(value);
			router.push(`?${params.toString()}`, { scroll: false });
		});

		if (autoCloseOnSelect) {
			// Small delay for visual feedback before closing
			setTimeout(() => {
				onOpenChange(false);
			}, 150);
		}
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader className="pb-2">
					<DrawerTitle>{title}</DrawerTitle>
				</DrawerHeader>
				<DrawerBody className="pb-6">
					<div
						role="radiogroup"
						aria-label={title}
						aria-busy={isPending}
						className="flex flex-col"
					>
						{options.map((option) => {
							const isSelected = optimisticValue === option.value;

							return (
								<button
									key={option.value}
									type="button"
									role="radio"
									aria-checked={isSelected}
									onClick={() => handleSelect(option.value)}
									disabled={isPending}
									className={cn(
										"flex items-center justify-between w-full px-4 py-3.5",
										"text-left text-base",
										"rounded-lg",
										"transition-colors duration-150",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
										isSelected
											? "bg-primary/10 text-primary font-medium"
											: "hover:bg-muted/50 text-foreground",
										isPending && "opacity-60 pointer-events-none"
									)}
								>
									<span>{option.label}</span>
									{isSelected && (
										<Check
											className="size-5 text-primary shrink-0"
											aria-hidden="true"
										/>
									)}
								</button>
							);
						})}
					</div>

					{/* Live region for screen readers */}
					<span role="status" aria-live="polite" className="sr-only">
						{isPending ? "Mise a jour du tri..." : ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
