"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
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
	const currentValue = searchParams.get(paramKey) ?? "";

	// Optimistic state for immediate UI feedback
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

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
	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
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
				<DrawerHeader className="relative pb-2">
					<DrawerTitle className="flex items-center gap-2">
						{title}
						{selectedLabel && (
							<span className="text-muted-foreground text-sm font-normal">({selectedLabel})</span>
						)}
					</DrawerTitle>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onOpenChange(false)}
						className="absolute top-4 right-4 size-11"
						aria-label="Fermer"
					>
						<X className="size-4" />
					</Button>
				</DrawerHeader>
				<DrawerBody className="overflow-y-visible pb-20">
					<div
						role="radiogroup"
						aria-label={title}
						aria-busy={isPending}
						className="divide-border/50 flex flex-col divide-y"
					>
						{allOptions.map((option, index) => {
							const isSelected =
								option.value === "" ? optimisticValue === "" : optimisticValue === option.value;
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
										"flex w-full items-center justify-between",
										"-mx-1 px-4 py-3.5",
										"text-left text-base",
										"transition-colors duration-150",
										"focus-visible:ring-primary focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
										isSelected && !isResetOption
											? "bg-primary/5 -mx-1 rounded-lg px-5 font-medium"
											: isSelected && isResetOption
												? "bg-muted/30 text-muted-foreground -mx-1 rounded-lg px-5 font-medium"
												: "hover:bg-muted/50 text-foreground",
										isPending && "pointer-events-none opacity-60",
										isResetOption && !isSelected && "text-muted-foreground",
									)}
								>
									<span className="flex items-center gap-2">
										{isResetOption && <X className="size-4" aria-hidden="true" />}
										{option.label}
									</span>
									<AnimatePresence mode="wait">
										{isSelected && !isResetOption && (
											<m.div
												initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
												transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
											>
												<Check className="text-primary size-5 shrink-0" aria-hidden="true" />
											</m.div>
										)}
									</AnimatePresence>
								</button>
							);
						})}
					</div>

					{/* Live region for screen readers */}
					<span role="status" aria-live="polite" className="sr-only">
						{isPending ? `Tri en cours : ${selectedLabel ?? "par défaut"}...` : ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
