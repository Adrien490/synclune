"use client";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AUTOCOMPLETE_ANIMATIONS, AUTOCOMPLETE_DEFAULTS } from "./constants";
import type { AutocompleteProps } from "./types";

export function Autocomplete<T>({
	name,
	value,
	onChange,
	disabled,
	onSelect,
	items,
	getItemLabel,
	getItemDescription,
	getItemImage,
	imageSize = AUTOCOMPLETE_DEFAULTS.imageSize,
	placeholder = AUTOCOMPLETE_DEFAULTS.placeholder,
	isLoading = false,
	className,
	inputClassName,
	noResultsMessage = AUTOCOMPLETE_DEFAULTS.noResultsMessage,
	minQueryLength = AUTOCOMPLETE_DEFAULTS.minQueryLength,
	blurDelay = AUTOCOMPLETE_DEFAULTS.blurDelay,
	loadingSkeletonCount = AUTOCOMPLETE_DEFAULTS.loadingSkeletonCount,
	showSearchIcon = AUTOCOMPLETE_DEFAULTS.showSearchIcon,
	showClearButton = AUTOCOMPLETE_DEFAULTS.showClearButton,
}: AutocompleteProps<T>) {
	// IDs uniques pour eviter les collisions
	const id = useId();
	const listboxId = `${id}-listbox`;
	const getItemId = (index: number) => `${id}-item-${index}`;

	// Etats
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	// Ref pour cleanup timeout
	const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Calculs derives
	const hasValidQuery = value.length >= minQueryLength;
	const hasResults = items.length > 0;
	const showResults = isOpen && hasValidQuery;
	const showMinQueryHint = value.length > 0 && value.length < minQueryLength;
	const remainingChars = minQueryLength - value.length;

	// Reset activeIndex quand les items changent
	useEffect(() => {
		setActiveIndex(-1);
	}, [items.length]);

	// Scroll automatique vers l'item actif
	useEffect(() => {
		if (activeIndex >= 0 && showResults) {
			const activeElement = document.getElementById(`${id}-item-${activeIndex}`);
			activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [activeIndex, id, showResults]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
			}
		};
	}, []);

	// Gestionnaires d'evenements
	const handleFocus = () => {
		if (value.length >= minQueryLength) {
			setIsOpen(true);
		}
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const currentTarget = e.currentTarget;

		if (blurTimeoutRef.current) {
			clearTimeout(blurTimeoutRef.current);
		}

		blurTimeoutRef.current = setTimeout(() => {
			if (!currentTarget.parentElement?.contains(document.activeElement)) {
				setIsOpen(false);
				setActiveIndex(-1);
			}
		}, blurDelay);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;

		// Toujours appeler onChange immediatement pour mettre a jour l'affichage
		// Le debounce est gere par le parent si necessaire
		onChange(newValue);

		setIsOpen(newValue.length >= minQueryLength);
		setActiveIndex(-1);
	};

	const handleClear = () => {
		onChange("");
		setIsOpen(false);
		setActiveIndex(-1);
	};

	const handleItemSelect = (item: T) => {
		onSelect(item);
		setIsOpen(false);
		setActiveIndex(-1);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) {
			if (e.key === "ArrowDown" && hasValidQuery && hasResults) {
				e.preventDefault();
				setIsOpen(true);
				setActiveIndex(0);
			}
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
				break;

			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((prev) => Math.max(prev - 1, -1));
				break;

			case "Home":
				e.preventDefault();
				setActiveIndex(0);
				break;

			case "End":
				e.preventDefault();
				setActiveIndex(items.length - 1);
				break;

			case "Enter":
				if (activeIndex >= 0 && items[activeIndex]) {
					e.preventDefault();
					onSelect(items[activeIndex]);
					setIsOpen(false);
					setActiveIndex(-1);
				}
				break;

			case "Escape":
				e.preventDefault();
				setIsOpen(false);
				setActiveIndex(-1);
				break;

			case "Tab":
				setIsOpen(false);
				setActiveIndex(-1);
				break;

			default:
				break;
		}
	};

	return (
		<MotionConfig reducedMotion="user">
			<div className={cn("relative w-full", className)}>
				<div className="relative">
					<Input
						name={name}
						type="text"
						disabled={disabled}
						value={value}
						onChange={handleInputChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						startIcon={
							showSearchIcon ? (
								<SearchIcon className="size-4 text-muted-foreground" />
							) : undefined
						}
						clearable={showClearButton && value.length > 0}
						onClear={handleClear}
						className={cn(isLoading && !showClearButton && "pr-10", inputClassName)}
						aria-autocomplete="list"
						aria-controls={showResults ? listboxId : undefined}
						aria-expanded={showResults}
						aria-activedescendant={
							showResults && activeIndex >= 0 ? getItemId(activeIndex) : undefined
						}
						autoComplete="off"
					/>

					{/* Loading spinner dans l'input (si pas de clear button) */}
					{isLoading && !showClearButton && (
						<div className="absolute right-3 top-1/2 -translate-y-1/2">
							<Spinner className="size-4 text-muted-foreground" />
						</div>
					)}
				</div>

				{/* Hint pour minQueryLength */}
				<AnimatePresence>
					{showMinQueryHint && (
						<motion.p
							className="text-sm md:text-xs text-muted-foreground mt-1.5 ml-0.5"
							initial={AUTOCOMPLETE_ANIMATIONS.hint.initial}
							animate={AUTOCOMPLETE_ANIMATIONS.hint.animate}
							exit={AUTOCOMPLETE_ANIMATIONS.hint.exit}
							transition={AUTOCOMPLETE_ANIMATIONS.hint.transition}
						>
							Tapez encore {remainingChars} caractère{remainingChars > 1 ? "s" : ""}
						</motion.p>
					)}
				</AnimatePresence>

				{/* Live region pour les annonces accessibles */}
				<span className="sr-only" aria-live="polite" aria-atomic="true">
					{isLoading
						? "Recherche en cours"
						: hasResults
							? `${items.length} résultat${items.length > 1 ? "s" : ""} trouvé${items.length > 1 ? "s" : ""}`
							: hasValidQuery
								? "Aucun résultat"
								: ""}
				</span>

				<AnimatePresence>
					{showResults && (
						<motion.ul
							id={listboxId}
							role="listbox"
							aria-label="Résultats de recherche"
							className="absolute z-10 w-full mt-1 max-h-[50dvh] md:max-h-80 overflow-auto rounded-md border shadow-lg py-1 text-base md:text-sm focus:outline-hidden bg-background"
							initial={AUTOCOMPLETE_ANIMATIONS.dropdown.initial}
							animate={AUTOCOMPLETE_ANIMATIONS.dropdown.animate}
							exit={AUTOCOMPLETE_ANIMATIONS.dropdown.exit}
							transition={AUTOCOMPLETE_ANIMATIONS.dropdown.transition}
						>
							{isLoading ? (
								<>
									{[...Array(loadingSkeletonCount)].map((_, i) => (
										<li key={i} className="py-3 px-3 md:py-2" aria-hidden="true">
											<div className="flex items-center gap-3">
												{getItemImage && (
													<Skeleton
														className="size-10 rounded-sm shrink-0"
														style={{ animationDelay: `${i * 100}ms` }}
													/>
												)}
												<div className="flex flex-col flex-1 gap-1.5">
													<Skeleton
														className="h-4 w-3/4"
														style={{ animationDelay: `${i * 100}ms` }}
													/>
													{getItemDescription && (
														<Skeleton
															className="h-3 w-1/2"
															style={{ animationDelay: `${i * 100 + 50}ms` }}
														/>
													)}
												</div>
											</div>
										</li>
									))}
								</>
							) : hasResults ? (
								items.map((item, index) => {
									const isActive = index === activeIndex;

									return (
										<motion.li
											key={index}
											id={getItemId(index)}
											role="option"
											aria-selected={isActive}
											aria-posinset={index + 1}
											aria-setsize={items.length}
											className={cn(
												// Touch target min 44px sur mobile (WCAG)
												"cursor-pointer select-none py-3 px-3 md:py-2 transition-colors duration-150",
												isActive
													? "bg-linear-to-r from-primary/10 to-transparent"
													: "bg-card hover:bg-muted"
											)}
											onClick={() => handleItemSelect(item)}
											onMouseEnter={() => setActiveIndex(index)}
											tabIndex={-1}
											initial={AUTOCOMPLETE_ANIMATIONS.item.initial}
											animate={AUTOCOMPLETE_ANIMATIONS.item.animate}
											transition={{
												delay: Math.min(
													index * AUTOCOMPLETE_ANIMATIONS.item.delayMultiplier,
													AUTOCOMPLETE_ANIMATIONS.item.maxDelay
												),
											}}
										>
											<div className="flex items-center gap-3">
												{getItemImage && getItemImage(item) && (
													<div className="shrink-0">
														<Image
															src={getItemImage(item)!.src}
															alt=""
															aria-hidden="true"
															width={imageSize}
															height={imageSize}
															sizes={`${imageSize}px`}
															quality={80}
															className="object-cover rounded-sm"
														/>
													</div>
												)}
												<div className="flex flex-col min-w-0 flex-1">
													<span className="text-sm font-medium truncate">
														{getItemLabel(item)}
													</span>
													{getItemDescription && getItemDescription(item) && (
														<span className="text-xs text-muted-foreground truncate">
															{getItemDescription(item)}
														</span>
													)}
												</div>
											</div>
										</motion.li>
									);
								})
							) : (
								<li className="w-full">
									<Empty>
										<EmptyHeader>
											<EmptyMedia>
												<SearchIcon className="size-6" strokeWidth={1.5} />
											</EmptyMedia>
											<EmptyTitle>{noResultsMessage}</EmptyTitle>
											<EmptyDescription>
												Essayez de modifier votre recherche
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								</li>
							)}
						</motion.ul>
					)}
				</AnimatePresence>
			</div>
		</MotionConfig>
	);
}
