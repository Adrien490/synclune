"use client";

import { Input } from "@/shared/components/ui/input";
import { Spinner } from "@/shared/components/ui/spinner";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, m } from "motion/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
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
	noResultsDescription = AUTOCOMPLETE_DEFAULTS.noResultsDescription,
	emptyStateAction,
	minQueryLength = AUTOCOMPLETE_DEFAULTS.minQueryLength,
	blurDelay = AUTOCOMPLETE_DEFAULTS.blurDelay,
	loadingSkeletonCount = AUTOCOMPLETE_DEFAULTS.loadingSkeletonCount,
	showSearchIcon = AUTOCOMPLETE_DEFAULTS.showSearchIcon,
	showClearButton = AUTOCOMPLETE_DEFAULTS.showClearButton,
	debounceMs = AUTOCOMPLETE_DEFAULTS.debounceMs,
	showResultsCount = AUTOCOMPLETE_DEFAULTS.showResultsCount,
	showEmptyState = AUTOCOMPLETE_DEFAULTS.showEmptyState,
	haptic: hapticProp = "selection",
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
	"aria-required": ariaRequired,
	autoComplete = AUTOCOMPLETE_DEFAULTS.autoComplete,
	inputMode = AUTOCOMPLETE_DEFAULTS.inputMode,
	enterKeyHint = AUTOCOMPLETE_DEFAULTS.enterKeyHint,
	autoCorrect = AUTOCOMPLETE_DEFAULTS.autoCorrect,
	autoCapitalize = AUTOCOMPLETE_DEFAULTS.autoCapitalize,
	spellCheck = AUTOCOMPLETE_DEFAULTS.spellCheck,
}: AutocompleteProps<T>) {
	const isMobileDetected = useIsMobile();
	const mounted = useMounted();
	const isMobile = mounted && isMobileDetected;
	const triggerHaptic = useHaptic();

	const hapticEnabled = hapticProp !== false;
	const selectionPattern = hapticEnabled ? hapticProp : null;

	// IDs uniques pour eviter les collisions
	const reactId = useId();
	const listboxId = `${reactId}-listbox`;
	const hintId = `${reactId}-hint`;
	const getItemId = (index: number) => `${reactId}-item-${index}`;

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
	const containerRef = useRef<HTMLDivElement>(null);
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
			const activeElement = document.getElementById(`${reactId}-item-${activeIndex}`);
			const instant = isMobile || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			activeElement?.scrollIntoView({
				block: "nearest",
				behavior: instant ? "instant" : "smooth",
			});
		}
	}, [activeIndex, reactId, showResults, isMobile]);

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

	const handleBlur = () => {
		// Flush du debounce en vol : sans ça, une soumission de formulaire dans
		// les `debounceMs` suivant la dernière frappe lit une valeur stale.
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = undefined;
			onChange(localValue);
		}

		if (blurTimeoutRef.current) {
			clearTimeout(blurTimeoutRef.current);
		}

		blurTimeoutRef.current = setTimeout(() => {
			// Le conteneur racine, pas `parentElement` : le listbox est un sibling
			// du wrapper interne de l'Input — l'ancien check ne le contenait jamais,
			// et cliquer « Réessayer » fermait le dropdown pendant le retry.
			if (!containerRef.current?.contains(document.activeElement)) {
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
				debounceRef.current = undefined;
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
		if (hapticEnabled) triggerHaptic("light");

		// Annuler tout debounce en cours
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = undefined;
		}

		// Rendre le focus au champ : le bouton d'effacement se démonte dès que la
		// valeur est vide (`ui/input.tsx`), donc sans ceci le focus retombe sur
		// <body> et l'utilisateur clavier perd sa position (WCAG 2.4.3). Même
		// contrat que `SearchInput.handleClear`. Audit recherche 2026-07-26.
		inputRef.current?.focus();
	};

	const handleItemSelect = (item: T) => {
		// Annuler le debounce en vol AVANT onSelect : sinon le onChange stale du
		// timer re-clobber la valeur écrite par onSelect ~debounceMs après le clic
		// (au checkout, l'adresse sélectionnée revenait au fragment tapé).
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = undefined;
		}
		if (selectionPattern) triggerHaptic(selectionPattern);
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
		onSelect: handleItemSelect,
		onHaptic: hapticEnabled ? triggerHaptic : undefined,
	});

	// Taille d'image adaptee mobile/desktop
	const effectiveImageSize = isMobile ? AUTOCOMPLETE_DEFAULTS.imageSizeMobile : imageSize;

	// On mobile, show fewer skeletons to avoid hiding other form fields
	const effectiveSkeletonCount = isMobile
		? Math.min(loadingSkeletonCount, AUTOCOMPLETE_DEFAULTS.loadingSkeletonCountMobile)
		: loadingSkeletonCount;

	// Pas de <MotionConfig reducedMotion="user"> local : le MotionProvider racine
	// (app/layout.tsx) applique déjà exactement ce réglage à tout le body.
	return (
		<div ref={containerRef} className={cn("relative w-full", className)}>
			<div className="relative">
				<Input
					ref={inputRef}
					id={name}
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
						// Le spinner remplace la loupe pendant le chargement : en `endIcon`
						// il était invisible dans toutes les configurations (le bouton clear
						// est prioritaire dès que le champ a une valeur — toujours le cas
						// pendant une recherche). `presentational` : la live region annonce
						// déjà « Recherche en cours ».
						showSearchIcon ? (
							isLoading ? (
								<Spinner presentational />
							) : (
								<MagnifyingGlassIcon className="text-muted-foreground size-4" />
							)
						) : undefined
					}
					clearable={showClearButton}
					onClear={handleClear}
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
					autoComplete={autoComplete}
					inputMode={inputMode}
					enterKeyHint={enterKeyHint}
					autoCorrect={autoCorrect}
					autoCapitalize={autoCapitalize}
					spellCheck={spellCheck}
				/>
			</div>

			{/* Hint pour minQueryLength */}
			<AnimatePresence mode="popLayout">
				{showMinQueryHint && (
					<m.p
						id={hintId}
						className="text-muted-foreground mt-1.5 ml-0.5 text-sm md:text-xs"
						initial={AUTOCOMPLETE_ANIMATIONS.hint.initial}
						animate={AUTOCOMPLETE_ANIMATIONS.hint.animate}
						exit={AUTOCOMPLETE_ANIMATIONS.hint.exit}
						transition={AUTOCOMPLETE_ANIMATIONS.hint.transition}
					>
						Encore {remainingChars} caractère{remainingChars > 1 ? "s" : ""}
					</m.p>
				)}
			</AnimatePresence>

			{/* Live region */}
			<AutocompleteLiveRegion
				isOpen={isOpen}
				isLoading={isLoading}
				hasResults={hasResults}
				hasValidQuery={hasValidQuery}
				itemCount={items.length}
			/>

			<AnimatePresence mode="popLayout">
				{showResults && (
					<m.ul
						id={listboxId}
						role="listbox"
						aria-label="Résultats de recherche"
						aria-busy={isLoading || undefined}
						// preventDefault sur mousedown : l'input garde le focus pendant
						// toute interaction dans le dropdown (clic « Réessayer »,
						// press-hold sur une option) — sans ça le blur-timeout démonte
						// la cible sous le curseur. Exception : le `<ul>` lui-même,
						// pour ne pas casser le drag de sa scrollbar (Firefox).
						onMouseDown={(e) => {
							if (e.target !== e.currentTarget) e.preventDefault();
						}}
						className="bg-background absolute z-(--z-float) mt-1 max-h-[min(20rem,calc(var(--vvh,100dvh)*0.5))] w-full overflow-auto overscroll-contain rounded-xl border py-1 text-sm shadow-lg focus:outline-hidden"
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
							noResultsDescription={noResultsDescription}
							emptyStateAction={emptyStateAction}
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
							hapticOnRetry={hapticEnabled ? "light" : false}
						/>
					</m.ul>
				)}
			</AnimatePresence>
		</div>
	);
}
