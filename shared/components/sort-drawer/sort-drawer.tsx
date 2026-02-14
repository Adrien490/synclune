"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import type { SortOption } from "@/shared/types/sort.types";
import { cn } from "@/shared/utils/cn";

export type { SortOption };

interface SortDrawerProps {
	/** Controlled open state */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** Available sort options */
	options: SortOption[];
	/** URL parameter key for sort */
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
 *     { value: "price-descending", label: "Prix décroissant" },
 *     { value: "created-descending", label: "Plus récents" },
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
	resetLabel = "Par défaut",
}: SortDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const shouldReduceMotion = useReducedMotion();

	// URL parameter key (no prefix)
	const paramKey = filterKey;

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
			// Délai pour voir la confirmation visuelle avant fermeture
			// Pas de délai si reduced motion est activé
			const delay = shouldReduceMotion ? 0 : 250;
			setTimeout(() => {
				onOpenChange(false);
			}, delay);
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
				<DrawerHeader className="pb-2 relative">
					<DrawerTitle className="flex items-center gap-2">
						{title}
						{selectedLabel && (
							<span className="text-sm text-muted-foreground font-normal">
								({selectedLabel})
							</span>
						)}
					</DrawerTitle>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onOpenChange(false)}
						className="absolute right-4 top-4 size-11"
						aria-label="Fermer"
					>
						<X className="size-4" />
					</Button>
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
										isSelected && !isResetOption
											? "bg-primary/5 font-medium -mx-1 px-5 rounded-lg"
											: isSelected && isResetOption
												? "bg-muted/30 text-muted-foreground font-medium -mx-1 px-5 rounded-lg"
												: "hover:bg-muted/50 text-foreground",
										isPending && "opacity-60 pointer-events-none",
										isResetOption && !isSelected && "text-muted-foreground"
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
												initial={
													shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }
												}
												animate={{ opacity: 1, scale: 1 }}
												exit={
													shouldReduceMotion
														? undefined
														: { opacity: 0, scale: 0.8 }
												}
												transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
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
							? `Tri en cours : ${selectedLabel || "par défaut"}...`
							: ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
