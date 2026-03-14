"use client";

import { Input } from "@/shared/components/ui/input";
import { Spinner } from "@/shared/components/ui/spinner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, m, MotionConfig } from "motion/react";
import { SearchIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AutocompleteLiveRegion } from "./autocomplete-live-region";
import { AutocompleteListContent } from "./autocomplete-list-content";
import { AUTOCOMPLETE_ANIMATIONS, AUTOCOMPLETE_DEFAULTS } from "./constants";
import type { AutocompleteProps } from "./types";
import { useAutocompleteKeyboard } from "./use-autocomplete-keyboard";

export function Autocomplete<T>({
	name,
	value,
	onChange,
	disabled,
	onSelect,
	items,
	getItemLabel,
	getItemKey,
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
	showEmptyState = AUTOCOMPLETE_DEFAULTS.showEmptyState,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
	"aria-required": ariaRequired,
}: AutocompleteProps<T>) {
	const isMobileDetected = useIsMobile();
	const mounted = useMounted();
	const isMobile = mounted && isMobileDetected;

	// IDs uniques pour eviter les collisions
	const id = useId();
	const listboxId = `${id}-listbox`;
	const hintId = `${id}-hint`;
	const getItemId = (index: number) => `${id}-item-${index}`;

	// Etats
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	// Etat local pour le debounce (affichage immediat)
	// Render-time sync: when external value changes (e.g. onSelect clearing),
	// update localValue without useEffect to avoid extra render cycle.
	const [localValue, setLocalValue] = useState(value);
	const [prevExternalValue, setPrevExternalValue] = useState(value);
	if (prevExternalValue !== value) {
		setPrevExternalValue(value);
		setLocalValue(value);
	}

	// Refs
	const inputRef = useRef<HTMLInputElement>(null);
	const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Reset active index when items change (render-time sync)
	const [prevItemsLength, setPrevItemsLength] = useState(items.length);
	if (prevItemsLength !== items.length) {
		setPrevItemsLength(items.length);
		setActiveIndex(-1);
	}

	// Calculs derives
	const hasValidQuery = localValue.length >= minQueryLength;
	const hasResults = items.length > 0;
	const hasContent = hasResults || isLoading || !!error || showEmptyState;
	const showResults = isOpen && hasValidQuery && hasContent;
	const showMinQueryHint = localValue.length > 0 && localValue.length < minQueryLength;
	const remainingChars = minQueryLength - localValue.length;

	// Delai de blur adapte mobile/desktop
	const effectiveBlurDelay = isMobile ? AUTOCOMPLETE_DEFAULTS.blurDelayMobile : blurDelay;

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

	const handleKeyDown = useAutocompleteKeyboard({
		isOpen,
		hasValidQuery,
		hasResults,
		items,
		activeIndex,
		setIsOpen,
		setActiveIndex,
		onSelect,
	});

	// Taille d'image adaptee mobile/desktop
	const effectiveImageSize = isMobile ? AUTOCOMPLETE_DEFAULTS.imageSizeMobile : imageSize;

	// On mobile, show fewer skeletons to avoid hiding other form fields
	const effectiveSkeletonCount = isMobile
		? Math.min(loadingSkeletonCount, AUTOCOMPLETE_DEFAULTS.loadingSkeletonCountMobile)
		: loadingSkeletonCount;

	return (
		<MotionConfig reducedMotion="user">
			<div className={cn("relative w-full", className)}>
				<div className="relative">
					<Input
						ref={inputRef}
						name={name}
						type="text"
						role="combobox"
						disabled={disabled}
						value={localValue}
						onChange={handleInputChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						startIcon={
							showSearchIcon ? <SearchIcon className="text-muted-foreground size-4" /> : undefined
						}
						clearable={showClearButton}
						onClear={handleClear}
						endIcon={isLoading ? <Spinner className="size-5" /> : undefined}
						className={inputClassName}
						aria-autocomplete="list"
						aria-controls={showResults ? listboxId : undefined}
						aria-expanded={showResults}
						aria-activedescendant={
							showResults && activeIndex >= 0 ? getItemId(activeIndex) : undefined
						}
						aria-describedby={
							[showMinQueryHint ? hintId : null, ariaDescribedBy].filter(Boolean).join(" ") ||
							undefined
						}
						aria-invalid={ariaInvalid}
						aria-required={ariaRequired}
						autoComplete="off"
					/>
				</div>

				{/* Hint pour minQueryLength */}
				<AnimatePresence mode="wait">
					{showMinQueryHint && (
						<m.p
							id={hintId}
							className="text-muted-foreground mt-1.5 ml-0.5 text-sm md:text-xs"
							initial={AUTOCOMPLETE_ANIMATIONS.hint.initial}
							animate={AUTOCOMPLETE_ANIMATIONS.hint.animate}
							exit={AUTOCOMPLETE_ANIMATIONS.hint.exit}
							transition={AUTOCOMPLETE_ANIMATIONS.hint.transition}
						>
							Tapez encore {remainingChars} caractère{remainingChars > 1 ? "s" : ""}
						</m.p>
					)}
				</AnimatePresence>

				{/* Live region */}
				<AutocompleteLiveRegion
					isLoading={isLoading}
					hasResults={hasResults}
					hasValidQuery={hasValidQuery}
					itemCount={items.length}
				/>

				<AnimatePresence mode="wait">
					{showResults && (
						<m.ul
							id={listboxId}
							role="listbox"
							aria-label="Résultats de recherche"
							className="bg-background absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border py-1 text-sm shadow-lg focus:outline-hidden"
							initial={AUTOCOMPLETE_ANIMATIONS.dropdown.initial}
							animate={AUTOCOMPLETE_ANIMATIONS.dropdown.animate}
							exit={AUTOCOMPLETE_ANIMATIONS.dropdown.exit}
							transition={AUTOCOMPLETE_ANIMATIONS.dropdown.transition}
						>
							<AutocompleteListContent
								items={items}
								activeIndex={activeIndex}
								error={error}
								isLoading={isLoading}
								hasResults={hasResults}
								showResultsCount={showResultsCount}
								showEmptyState={showEmptyState}
								noResultsMessage={noResultsMessage}
								onRetry={onRetry}
								getItemLabel={getItemLabel}
								getItemKey={getItemKey}
								getItemDescription={getItemDescription}
								getItemImage={getItemImage}
								effectiveImageSize={effectiveImageSize}
								onItemSelect={handleItemSelect}
								onItemHover={setActiveIndex}
								getItemId={getItemId}
								loadingSkeletonCount={effectiveSkeletonCount}
							/>
						</m.ul>
					)}
				</AnimatePresence>
			</div>
		</MotionConfig>
	);
}
