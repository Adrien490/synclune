"use client";

import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
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
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { AlertCircleIcon, ArrowLeftIcon, SearchIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
	error,
	onRetry,
	className,
	inputClassName,
	noResultsMessage = AUTOCOMPLETE_DEFAULTS.noResultsMessage,
	minQueryLength = AUTOCOMPLETE_DEFAULTS.minQueryLength,
	blurDelay = AUTOCOMPLETE_DEFAULTS.blurDelay,
	loadingSkeletonCount = AUTOCOMPLETE_DEFAULTS.loadingSkeletonCount,
	showSearchIcon = AUTOCOMPLETE_DEFAULTS.showSearchIcon,
	showClearButton = AUTOCOMPLETE_DEFAULTS.showClearButton,
	debounceMs = AUTOCOMPLETE_DEFAULTS.debounceMs,
	showResultsCount = AUTOCOMPLETE_DEFAULTS.showResultsCount,
}: AutocompleteProps<T>) {
	const isMobile = useIsMobile();

	// IDs uniques pour eviter les collisions
	const id = useId();
	const listboxId = `${id}-listbox`;
	const hintId = `${id}-hint`;
	const getItemId = (index: number) => `${id}-item-${index}`;

	// Etats
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	// Etat local pour le debounce (affichage immediat)
	const [localValue, setLocalValue] = useState(value);

	// Refs
	const inputRef = useRef<HTMLInputElement>(null);
	const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Calculs derives
	const hasValidQuery = localValue.length >= minQueryLength;
	const hasResults = items.length > 0;
	const showResults = isOpen && hasValidQuery;
	const showMinQueryHint = localValue.length > 0 && localValue.length < minQueryLength;
	const remainingChars = minQueryLength - localValue.length;

	// Delai de blur adapte mobile/desktop
	const effectiveBlurDelay = isMobile
		? AUTOCOMPLETE_DEFAULTS.blurDelayMobile
		: blurDelay;

	// Sync valeur externe → locale
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	// Reset activeIndex quand les items changent
	useEffect(() => {
		setActiveIndex(-1);
	}, [items.length]);

	// Scroll automatique vers l'item actif
	useEffect(() => {
		if (activeIndex >= 0 && showResults) {
			const activeElement = document.getElementById(`${id}-item-${activeIndex}`);
			activeElement?.scrollIntoView({
				block: "nearest",
				behavior: isMobile ? "instant" : "smooth",
			});
		}
	}, [activeIndex, id, showResults, isMobile]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
			}
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	// Gestionnaires d'evenements
	const handleFocus = () => {
		if (localValue.length >= minQueryLength) {
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
		}, effectiveBlurDelay);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;

		// Affichage immediat
		setLocalValue(newValue);
		setIsOpen(newValue.length >= minQueryLength);
		setActiveIndex(-1);

		// Debounce pour le callback parent
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		if (debounceMs > 0) {
			debounceRef.current = setTimeout(() => {
				onChange(newValue);
			}, debounceMs);
		} else {
			onChange(newValue);
		}
	};

	const handleClear = () => {
		setLocalValue("");
		onChange("");
		setIsOpen(false);
		setActiveIndex(-1);

		// Annuler tout debounce en cours
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
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

	// Taille d'image adaptee mobile/desktop
	const effectiveImageSize = isMobile
		? AUTOCOMPLETE_DEFAULTS.imageSizeMobile
		: imageSize;

	// Composant de rendu d'un item (partage entre desktop et mobile)
	const renderItem = (item: T, index: number, isActive: boolean) => {
		const imageData = getItemImage?.(item);

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
					isActive ? "bg-accent" : "bg-card hover:bg-muted"
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
					{imageData && (
						<div
							className="shrink-0 relative overflow-hidden rounded-sm"
							style={{ width: effectiveImageSize, height: effectiveImageSize }}
						>
							<Image
								src={imageData.src}
								alt={imageData.alt}
								aria-hidden={!imageData.alt}
								fill
								sizes={`${effectiveImageSize}px`}
								quality={80}
								className="object-cover"
								placeholder={imageData.blurDataUrl ? "blur" : "empty"}
								blurDataURL={imageData.blurDataUrl ?? undefined}
							/>
						</div>
					)}
					<div className="flex flex-col min-w-0 flex-1">
						<span className="text-sm font-medium truncate">
							{getItemLabel(item)}
						</span>
						{getItemDescription && getItemDescription(item) && (
							<span className="text-xs text-muted-foreground line-clamp-2">
								{getItemDescription(item)}
							</span>
						)}
					</div>
				</div>
			</motion.li>
		);
	};

	// Composant de rendu du skeleton de chargement
	const renderLoadingSkeletons = () => (
		<>
			{[...Array(loadingSkeletonCount)].map((_, i) => (
				<li key={i} className="py-3 px-3 md:py-2" aria-hidden="true">
					<div className="flex items-center gap-3">
						{getItemImage && (
							<Skeleton
								className="rounded-sm shrink-0"
								style={{
									width: effectiveImageSize,
									height: effectiveImageSize,
									animationDelay: `${i * 100}ms`,
								}}
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
	);

	// Composant de rendu de l'etat vide
	const renderEmptyState = () => (
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
	);

	// Composant de rendu de l'etat d'erreur
	const renderErrorState = () => {
		if (!error) return null;

		return (
			<li className="w-full">
				<Empty>
					<EmptyHeader>
						<EmptyMedia>
							<AlertCircleIcon className="size-6 text-destructive" strokeWidth={1.5} />
						</EmptyMedia>
						<EmptyTitle className="text-destructive">{error}</EmptyTitle>
						{onRetry && (
							<Button variant="ghost" size="sm" onClick={onRetry}>
								Réessayer
							</Button>
						)}
					</EmptyHeader>
				</Empty>
			</li>
		);
	};

	// Composant compteur de resultats
	const renderResultsCount = () => {
		if (!showResultsCount || !hasResults || isLoading) return null;

		return (
			<li
				role="presentation"
				className="px-3 py-1.5 text-xs text-muted-foreground border-b bg-muted/30"
			>
				{items.length} résultat{items.length > 1 ? "s" : ""}
			</li>
		);
	};

	// Rendu du contenu de la liste
	const renderListContent = () => {
		// Erreur en priorite
		if (error) {
			return renderErrorState();
		}

		if (isLoading) {
			return renderLoadingSkeletons();
		}

		if (hasResults) {
			return (
				<>
					{renderResultsCount()}
					{items.map((item, index) => renderItem(item, index, index === activeIndex))}
				</>
			);
		}

		return renderEmptyState();
	};

	// Live region pour les annonces accessibles
	const renderLiveRegion = () => (
		<span className="sr-only" aria-live="polite" aria-atomic="true">
			{isLoading
				? "Recherche en cours"
				: hasResults
					? `${items.length} résultat${items.length > 1 ? "s" : ""} trouvé${items.length > 1 ? "s" : ""}`
					: hasValidQuery
						? "Aucun résultat"
						: ""}
		</span>
	);

	// ========================================
	// VERSION MOBILE - Drawer fullscreen
	// ========================================
	if (isMobile) {
		return (
			<>
				{/* Input trigger (readonly sur mobile) */}
				<div className={cn("relative w-full", className)}>
					<Input
						name={name}
						type="text"
						role="combobox"
						disabled={disabled}
						value={localValue}
						readOnly
						onClick={() => !disabled && setIsOpen(true)}
						placeholder={localValue ? placeholder : "Appuyer pour rechercher..."}
						startIcon={
							showSearchIcon ? (
								<SearchIcon className="size-4 text-muted-foreground" />
							) : undefined
						}
						className={cn("cursor-pointer", inputClassName)}
						aria-haspopup="listbox"
						aria-expanded={isOpen}
					/>
				</div>

				{/* Drawer fullscreen */}
				<Drawer open={isOpen} onOpenChange={setIsOpen} direction="bottom">
					<DrawerContent className="h-[100dvh] max-h-[100dvh] flex flex-col rounded-none">
						{/* Titre masqué pour l'accessibilité */}
						<DrawerTitle className="sr-only">Recherche</DrawerTitle>
						{/* Header avec input de recherche */}
						<div className="sticky top-0 bg-background border-b px-3 py-3 flex items-center gap-2">
							<DrawerClose asChild>
								<button
									type="button"
									className="shrink-0 p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
									aria-label="Fermer"
								>
									<ArrowLeftIcon className="size-5" />
								</button>
							</DrawerClose>
							<Input
								type="text"
								value={localValue}
								onChange={handleInputChange}
								onKeyDown={handleKeyDown}
								placeholder={placeholder}
								startIcon={
									showSearchIcon ? (
										<SearchIcon className="size-4 text-muted-foreground" />
									) : undefined
								}
								clearable={showClearButton && localValue.length > 0 && !isLoading}
								onClear={handleClear}
								endIcon={isLoading ? <Spinner className="size-5" /> : undefined}
								className="flex-1"
								aria-autocomplete="list"
								aria-controls={listboxId}
								aria-activedescendant={
									activeIndex >= 0 ? getItemId(activeIndex) : undefined
								}
								aria-describedby={showMinQueryHint ? hintId : undefined}
								autoComplete="off"
							/>
						</div>

						{/* Hint pour minQueryLength */}
						<AnimatePresence>
							{showMinQueryHint && (
								<motion.p
									id={hintId}
									className="text-sm text-muted-foreground px-4 py-2 border-b"
									initial={AUTOCOMPLETE_ANIMATIONS.hint.initial}
									animate={AUTOCOMPLETE_ANIMATIONS.hint.animate}
									exit={AUTOCOMPLETE_ANIMATIONS.hint.exit}
									transition={AUTOCOMPLETE_ANIMATIONS.hint.transition}
								>
									Tapez encore {remainingChars} caractère{remainingChars > 1 ? "s" : ""}
								</motion.p>
							)}
						</AnimatePresence>

						{/* Live region */}
						{renderLiveRegion()}

						{/* Liste des resultats */}
						<ul
							id={listboxId}
							role="listbox"
							aria-label="Résultats de recherche"
							className="flex-1 overflow-auto"
						>
							{renderListContent()}
						</ul>
					</DrawerContent>
				</Drawer>
			</>
		);
	}

	// ========================================
	// VERSION DESKTOP - Dropdown classique
	// ========================================
	return (
		<MotionConfig reducedMotion="user">
			<div className={cn("relative w-full", className)}>
				<div className="relative">
					<Input
						ref={inputRef}
						name={name}
						type="text"
						disabled={disabled}
						value={localValue}
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
						clearable={showClearButton && localValue.length > 0 && !isLoading}
						onClear={handleClear}
						endIcon={isLoading ? <Spinner className="size-5" /> : undefined}
						className={inputClassName}
						aria-autocomplete="list"
						aria-controls={showResults ? listboxId : undefined}
						aria-expanded={showResults}
						aria-activedescendant={
							showResults && activeIndex >= 0 ? getItemId(activeIndex) : undefined
						}
						aria-describedby={showMinQueryHint ? hintId : undefined}
						autoComplete="off"
					/>
				</div>

				{/* Hint pour minQueryLength */}
				<AnimatePresence>
					{showMinQueryHint && (
						<motion.p
							id={hintId}
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

				{/* Live region */}
				{renderLiveRegion()}

				<AnimatePresence>
					{showResults && (
						<motion.ul
							id={listboxId}
							role="listbox"
							aria-label="Résultats de recherche"
							className="absolute z-50 w-full mt-1 max-h-80 overflow-auto rounded-md border shadow-lg py-1 text-sm focus:outline-hidden bg-background"
							initial={AUTOCOMPLETE_ANIMATIONS.dropdown.initial}
							animate={AUTOCOMPLETE_ANIMATIONS.dropdown.animate}
							exit={AUTOCOMPLETE_ANIMATIONS.dropdown.exit}
							transition={AUTOCOMPLETE_ANIMATIONS.dropdown.transition}
						>
							{renderListContent()}
						</motion.ul>
					)}
				</AnimatePresence>
			</div>
		</MotionConfig>
	);
}
