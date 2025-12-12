"use client";

import { useRef } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Check, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
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
	/** Show reset option to clear sort */
	showResetOption?: boolean;
	/** Label for reset option */
	resetLabel?: string;
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
 *   showResetOption
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
	showResetOption = false,
	resetLabel = "Par defaut",
}: SortDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// URL parameter key with filter prefix
	const paramKey = `filter_${filterKey}`;

	// Get current value from URL
	const currentValue = searchParams.get(paramKey) || "";

	// Optimistic state for immediate UI feedback
	const [optimisticValue, setOptimisticValue] =
		useOptimistic<string>(currentValue);

	// Get current selected label for aria-live and header
	const selectedLabel = options.find((o) => o.value === optimisticValue)?.label;

	// Build full options list with reset option
	const allOptions: SortOption[] = showResetOption
		? [{ value: "", label: resetLabel }, ...options]
		: options;

	// Handle option selection
	const handleSelect = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());

		// Update or remove the parameter
		if (value) {
			params.set(paramKey, value);
		} else {
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

	// Handle keyboard navigation
	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLButtonElement>,
		index: number
	) => {
		const optionCount = allOptions.length;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowDown":
			case "ArrowRight":
				e.preventDefault();
				nextIndex = (index + 1) % optionCount;
				break;
			case "ArrowUp":
			case "ArrowLeft":
				e.preventDefault();
				nextIndex = (index - 1 + optionCount) % optionCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = optionCount - 1;
				break;
		}

		if (nextIndex !== null) {
			optionRefs.current[nextIndex]?.focus();
		}
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader className="pb-2">
					<DrawerTitle className="flex items-center gap-2">
						{title}
						{selectedLabel && (
							<span className="text-sm text-muted-foreground font-normal">
								({selectedLabel})
							</span>
						)}
					</DrawerTitle>
				</DrawerHeader>
				<DrawerBody className="pb-6">
					<div
						role="radiogroup"
						aria-label={title}
						aria-busy={isPending}
						className="flex flex-col divide-y divide-border/50"
					>
						{allOptions.map((option, index) => {
							const isSelected =
								option.value === ""
									? optimisticValue === ""
									: optimisticValue === option.value;
							const isResetOption = option.value === "" && showResetOption;

							return (
								<button
									key={option.value || "__reset__"}
									ref={(el) => {
										optionRefs.current[index] = el;
									}}
									type="button"
									role="radio"
									aria-checked={isSelected}
									tabIndex={isSelected ? 0 : -1}
									onClick={() => handleSelect(option.value)}
									onKeyDown={(e) => handleKeyDown(e, index)}
									disabled={isPending}
									className={cn(
										"flex items-center justify-between w-full",
										"px-4 py-3.5 -mx-1",
										"text-left text-base",
										"transition-colors duration-150",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-lg",
										isSelected
											? "bg-primary/10 text-primary font-medium -mx-1 px-5 rounded-lg"
											: "hover:bg-muted/50 text-foreground",
										isPending && "opacity-60 pointer-events-none",
										isResetOption && "text-muted-foreground"
									)}
								>
									<span className="flex items-center gap-2">
										{isResetOption && (
											<X className="size-4" aria-hidden="true" />
										)}
										{option.label}
									</span>
									<AnimatePresence mode="wait">
										{isSelected && !isResetOption && (
											<motion.div
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												transition={{ duration: 0.15 }}
											>
												<Check
													className="size-5 text-primary shrink-0"
													aria-hidden="true"
												/>
											</motion.div>
										)}
									</AnimatePresence>
								</button>
							);
						})}
					</div>

					{/* Live region for screen readers */}
					<span role="status" aria-live="polite" className="sr-only">
						{isPending
							? `Tri en cours : ${selectedLabel || "par defaut"}...`
							: ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}

interface SortDrawerTriggerProps {
	/** Available sort options */
	options: SortOption[];
	/** URL parameter key for sort (will be prefixed with filter_) */
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
	const paramKey = `filter_${filterKey}`;
	const hasActiveSort = searchParams.has(paramKey);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				className={cn("size-9 relative", className)}
				aria-label="Trier"
			>
				<ArrowUpDown className="size-5" />
				{hasActiveSort && (
					<span
						className="absolute -top-1 -right-1 size-2.5 bg-primary rounded-full"
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
