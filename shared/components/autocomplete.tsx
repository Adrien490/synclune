"use client";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export interface AutocompleteProps<T> {
	name: string;
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
	onSelect: (item: T) => void;
	items: T[];
	getItemLabel: (item: T) => string;
	getItemDescription?: (item: T) => string | null;
	getItemImage?: (item: T) => { src: string; alt: string } | null;
	imageSize?: number;
	placeholder?: string;
	isLoading?: boolean;
	className?: string;
	inputClassName?: string;
	noResultsMessage?: string;
	minQueryLength?: number;
	blurDelay?: number;
}

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
	imageSize = 32,
	placeholder = "Rechercher...",
	isLoading = false,
	className,
	inputClassName,
	noResultsMessage = "Aucun résultat trouvé",
	minQueryLength = 3,
	blurDelay = 150,
}: AutocompleteProps<T>) {
	// IDs uniques pour éviter les collisions
	const id = useId();
	const listboxId = `${id}-listbox`;
	const getItemId = (index: number) => `${id}-item-${index}`;

	// États
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	// Ref pour cleanup timeout blur
	const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Calculs dérivés
	const hasValidQuery = value.length >= minQueryLength;
	const hasResults = items.length > 0;
	const showResults = isOpen && hasValidQuery;

	// Reset activeIndex quand les items changent
	useEffect(() => {
		setActiveIndex(-1);
	}, [items.length]);

	// Scroll automatique vers l'item actif
	useEffect(() => {
		if (activeIndex >= 0 && showResults) {
			const activeElement = document.getElementById(getItemId(activeIndex));
			activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, [activeIndex, getItemId, showResults]);

	// Cleanup timeout blur on unmount
	useEffect(() => {
		return () => {
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
			}
		};
	}, []);

	// Gestionnaires d'événements
	const handleFocus = () => {
		if (value.length >= minQueryLength) {
			setIsOpen(true);
		}
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		// Vérifier si le focus reste dans le composant
		const currentTarget = e.currentTarget;

		// Clear previous timeout si existe (évite multiples timeouts)
		if (blurTimeoutRef.current) {
			clearTimeout(blurTimeoutRef.current);
		}

		blurTimeoutRef.current = setTimeout(() => {
			// Si le focus n'est pas dans le composant parent, fermer
			if (!currentTarget.parentElement?.contains(document.activeElement)) {
				setIsOpen(false);
				setActiveIndex(-1);
			}
		}, blurDelay);
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		inputOnChange: (value: string) => void
	) => {
		const newValue = e.target.value;
		inputOnChange(newValue);
		setIsOpen(newValue.length >= minQueryLength);
		setActiveIndex(-1); // Reset l'index actif lors de la saisie
	};

	const handleItemSelect = (item: T, itemOnSelect: (item: T) => void) => {
		itemOnSelect(item);
		setIsOpen(false);
		setActiveIndex(-1);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) {
			// Ouvrir avec ArrowDown si fermé et query valide
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
				// Ferme le menu lors de la navigation par tabulation
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
				<Input
					name={name}
					type="text"
					disabled={disabled}
					value={value}
					onChange={(e) => handleInputChange(e, onChange)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className={cn(isLoading && "pr-10", inputClassName)}
					aria-autocomplete="list"
					aria-controls={showResults ? listboxId : undefined}
					aria-expanded={showResults}
					aria-activedescendant={
						showResults && activeIndex >= 0 ? getItemId(activeIndex) : undefined
					}
					autoComplete="off"
				/>

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
							className="absolute z-10 w-full mt-1 max-h-60 md:max-h-80 overflow-auto rounded-md border shadow-lg py-1 text-base md:text-sm focus:outline-hidden bg-background"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.15 }}
						>
							{isLoading ? (
								<>
									{[...Array(3)].map((_, i) => (
										<li key={i} className="py-1.5 px-3" aria-hidden="true">
											<div className="flex items-center gap-3">
												{getItemImage && (
													<Skeleton
														className="size-8 rounded-sm shrink-0"
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
												"cursor-pointer select-none py-1.5 px-3 transition-colors duration-150",
												isActive
													? "bg-gradient-to-r from-primary/10 to-transparent"
													: "bg-card hover:bg-muted"
											)}
											onClick={() => handleItemSelect(item, onSelect)}
											onMouseEnter={() => setActiveIndex(index)}
											tabIndex={-1}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: Math.min(index * 0.03, 1.5) }}
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
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={1.5}
														d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
													/>
												</svg>
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
