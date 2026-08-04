"use client";

import {
	useEffect,
	useOptimistic,
	useRef,
	useState,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useHaptic } from "@/shared/hooks/use-haptic";
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
	/**
	 * DOM `id` of the drawer content node. Wire in pair with `aria-controls`
	 * on the trigger button.
	 */
	id?: string;
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
function SortDrawerInner({
	open,
	onOpenChange,
	options,
	filterKey = "sortBy",
	title = "Trier par",
	autoCloseOnSelect = true,
	showResetOption = false,
	resetLabel = "Par défaut",
	id,
}: SortDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const appliedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [appliedLabel, setAppliedLabel] = useState<string | null>(null);
	const shouldReduceMotion = useReducedMotion();
	const triggerHaptic = useHaptic();

	// Nettoie les timers d'auto-close + d'annonce post-success si le composant
	// est démonté avant l'échéance.
	useEffect(() => {
		return () => {
			if (autoCloseTimerRef.current) {
				clearTimeout(autoCloseTimerRef.current);
			}
			if (appliedTimerRef.current) {
				clearTimeout(appliedTimerRef.current);
			}
		};
	}, []);

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			triggerHaptic("selection");
		}
		onOpenChange(next);
	};

	// Get current value from URL
	const currentValue = searchParams.get(filterKey) ?? "";

	// Optimistic state for immediate UI feedback
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	// Get current selected label for aria-live and header
	const selectedLabel = options.find((o) => o.value === optimisticValue)?.label;

	// Annonce SR post-success : sur la chute de `isPending`, on confirme l'application
	// du tri (« Tri appliqué : X »). Pattern identique à `StickyActionBar.announcementRef`.
	// Reset après 2s pour ne pas polluer les annonces ultérieures.
	const wasPendingRef = useRef(false);
	useEffect(() => {
		if (wasPendingRef.current && !isPending) {
			setAppliedLabel(selectedLabel ?? resetLabel);
			if (appliedTimerRef.current) {
				clearTimeout(appliedTimerRef.current);
			}
			appliedTimerRef.current = setTimeout(() => {
				appliedTimerRef.current = null;
				setAppliedLabel(null);
			}, 2000);
		}
		wasPendingRef.current = isPending;
	}, [isPending, selectedLabel, resetLabel]);

	// Build full options list with reset option
	const allOptions: SortOption[] = showResetOption
		? [{ value: "", label: resetLabel }, ...options]
		: options;

	// Source unique de vérité pour l'état sélectionné — partagée par le rendu
	// ET par le calcul du roving tabindex (doivent rester strictement cohérents).
	const isOptionSelected = (option: SortOption) =>
		option.value === "" ? optimisticValue === "" : optimisticValue === option.value;

	// Roving tabindex : un seul bouton dans l'ordre de tabulation. On cible
	// l'option sélectionnée ; à défaut (aucune sélection, showResetOption=false),
	// le premier bouton reste atteignable au clavier (WCAG 2.1.1).
	const selectedIndex = allOptions.findIndex(isOptionSelected);
	const focusableIndex = selectedIndex === -1 ? 0 : selectedIndex;

	// Au montage du drawer, on focus l'option active plutôt que la poignée de
	// drag (défaut non informatif) — pattern ARIA APG radiogroup.
	//
	// `initialFocus` de Base UI remplace l'ancien `onOpenAutoFocus` +
	// `preventDefault` : il attend l'ÉLÉMENT à focuser (ou `false` pour ne pas
	// bouger), au lieu d'un événement à neutraliser.
	const handleInitialFocus = () => optionRefs.current[focusableIndex] ?? false;

	// Handle option selection
	const handleSelect = (value: string) => {
		// Pas de haptic si l'utilisateur retape l'option déjà sélectionnée
		if (value !== optimisticValue) {
			triggerHaptic("light");
		}

		const params = new URLSearchParams(searchParams.toString());

		// Update or remove the parameter
		if (value) {
			params.set(filterKey, value);
		} else {
			params.delete(filterKey);
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
			// Annule un timer encore en vol avant d'en armer un nouveau : évite
			// qu'une réouverture rapide du drawer soit refermée par un timer périmé.
			if (autoCloseTimerRef.current) {
				clearTimeout(autoCloseTimerRef.current);
			}
			autoCloseTimerRef.current = setTimeout(() => {
				autoCloseTimerRef.current = null;
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
		<Drawer open={open} onOpenChange={handleOpenChange}>
			<DrawerContent id={id} initialFocus={handleInitialFocus}>
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
						onClick={() => handleOpenChange(false)}
						className="absolute top-4 right-4 size-11"
						aria-label="Fermer"
					>
						<XIcon className="size-4" />
					</Button>
				</DrawerHeader>
				<DrawerBody>
					<div
						role="radiogroup"
						aria-label={title}
						aria-busy={isPending}
						className="divide-border/50 flex flex-col divide-y"
					>
						{allOptions.map((option, index) => {
							const isSelected = isOptionSelected(option);
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
									tabIndex={index === focusableIndex ? 0 : -1}
									onClick={() => handleSelect(option.value)}
									onKeyDown={(e) => handleKeyDown(e, index)}
									className={cn(
										"flex w-full items-center justify-between",
										"-mx-1 px-4 py-3.5",
										"text-left text-base",
										"transition-colors duration-150",
										"focus-visible:ring-primary focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
										isSelected && !isResetOption
											? "bg-primary/5 rounded-lg font-medium"
											: isSelected && isResetOption
												? "bg-muted/30 text-muted-foreground rounded-lg font-medium"
												: "hover:bg-muted/50 text-foreground",
										isResetOption && !isSelected && "text-muted-foreground",
									)}
								>
									<span className="flex items-center gap-2">
										{isResetOption && <XIcon className="size-4" aria-hidden="true" />}
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
												<CheckIcon className="text-primary size-5 shrink-0" aria-hidden="true" />
											</m.div>
										)}
									</AnimatePresence>
								</button>
							);
						})}
					</div>

					{/* Live region for screen readers */}
					<span role="status" aria-live="polite" className="sr-only">
						{isPending
							? `Tri en cours : ${selectedLabel ?? "par défaut"}...`
							: appliedLabel
								? `Tri appliqué : ${appliedLabel}`
								: ""}
					</span>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}

export function SortDrawer(props: ComponentProps<typeof SortDrawerInner>) {
	return (
		<Suspense fallback={null}>
			<SortDrawerInner {...props} />
		</Suspense>
	);
}
