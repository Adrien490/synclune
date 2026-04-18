"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/components/ui/command";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/shared/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { Spinner } from "@/shared/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/view-transition";
import { ArrowLeftIcon, CheckIcon, ChevronDown, CircleX, SearchX, XIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as React from "react";
import { ARIA_CLEAR_DELAY, FOCUS_RING_DURATION, multiSelectVariants } from "./constants";
import type { MultiSelectOption, MultiSelectProps, MultiSelectRef, ScreenSize } from "./types";
import {
	arraysEqual,
	filterOptions,
	flattenOptions,
	getBadgeAnimationClass,
	getPopoverAnimationClass,
	getResponsiveSettings,
	getWidthConstraints,
	isGroupedOptions,
} from "./utils";

export const MultiSelect = React.forwardRef<MultiSelectRef, MultiSelectProps>(
	(
		{
			options,
			onValueChange,
			variant,
			defaultValue = [],
			placeholder = "Sélectionner",
			animation = 0,
			animationConfig,
			maxCount = 3,
			modalPopover = false,
			className,
			hideSelectAll = false,
			searchable = true,
			emptyIndicator,
			autoSize = false,
			singleLine = false,
			popoverClassName,
			disabled = false,
			responsive,
			minWidth,
			maxWidth,
			deduplicateOptions = false,
			resetOnDefaultValueChange = true,
			closeOnSelect = true,
			isLoading = false,
			"aria-describedby": externalAriaDescribedBy,
			...props
		},
		ref,
	) => {
		const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
		const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
		const [searchValue, setSearchValue] = React.useState("");

		const [politeMessage, setPoliteMessage] = React.useState("");
		const [assertiveMessage, setAssertiveMessage] = React.useState("");
		const prevSelectedCount = React.useRef(selectedValues.length);
		const prevIsOpen = React.useRef(isPopoverOpen);
		const prevSearchValue = React.useRef(searchValue);

		// Ref pour cleanup du timeout focus (P0 - Memory leak fix)
		const focusTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

		const isMobileDetected = useIsMobile();
		const mounted = useMounted();
		const isMobile = mounted && isMobileDetected;

		const haptic = useHaptic();
		const prefersReducedMotion = useReducedMotion();

		// Focus restoration : snapshot activeElement à l'ouverture, restore au close
		const previousFocusRef = React.useRef<HTMLElement | null>(null);

		// Announce function - messages nettoyés via useEffect
		const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
			if (priority === "assertive") {
				setAssertiveMessage(message);
			} else {
				setPoliteMessage(message);
			}
		};

		// P0 Fix: Cleanup des messages ARIA avec useEffect (évite memory leak)
		React.useEffect(() => {
			if (!politeMessage) return;
			const timeoutId = setTimeout(() => setPoliteMessage(""), ARIA_CLEAR_DELAY);
			return () => clearTimeout(timeoutId);
		}, [politeMessage]);

		React.useEffect(() => {
			if (!assertiveMessage) return;
			const timeoutId = setTimeout(() => setAssertiveMessage(""), ARIA_CLEAR_DELAY);
			return () => clearTimeout(timeoutId);
		}, [assertiveMessage]);

		// P0 Fix: Cleanup focusTimeout on unmount
		React.useEffect(() => {
			return () => {
				if (focusTimeoutRef.current) {
					clearTimeout(focusTimeoutRef.current);
				}
			};
		}, []);

		const multiSelectId = React.useId();
		const listboxId = `${multiSelectId}-listbox`;
		const triggerDescriptionId = `${multiSelectId}-description`;
		const selectedCountId = `${multiSelectId}-count`;

		const prevDefaultValueRef = React.useRef<string[]>(defaultValue);

		// Flat list of all options
		const allOptions = flattenOptions(options, deduplicateOptions);

		// P1 Fix: Compute enabled options once for performance
		const enabledOptions = allOptions.filter((option) => !option.disabled);
		const enabledCount = enabledOptions.length;
		const isAllSelected = selectedValues.length === enabledCount;

		const buttonRef = React.useRef<HTMLButtonElement>(null);

		React.useImperativeHandle(
			ref,
			() => ({
				reset: () => {
					setSelectedValues(defaultValue);
					setIsPopoverOpen(false);
					setSearchValue("");
					onValueChange(defaultValue);
				},
				getSelectedValues: () => selectedValues,
				setSelectedValues: (values: string[]) => {
					setSelectedValues(values);
					onValueChange(values);
				},
				clear: () => {
					setSelectedValues([]);
					onValueChange([]);
				},
				focus: () => {
					if (buttonRef.current) {
						buttonRef.current.focus();
						const originalOutline = buttonRef.current.style.outline;
						const originalOutlineOffset = buttonRef.current.style.outlineOffset;
						buttonRef.current.style.outline = "2px solid oklch(var(--ring))";
						buttonRef.current.style.outlineOffset = "2px";

						// P0 Fix: Clear previous timeout to prevent memory leak
						if (focusTimeoutRef.current) {
							clearTimeout(focusTimeoutRef.current);
						}
						focusTimeoutRef.current = setTimeout(() => {
							if (buttonRef.current) {
								buttonRef.current.style.outline = originalOutline;
								buttonRef.current.style.outlineOffset = originalOutlineOffset;
							}
							focusTimeoutRef.current = null;
						}, FOCUS_RING_DURATION);
					}
				},
			}),
			[defaultValue, selectedValues, onValueChange],
		);

		// Pour tablet/desktop responsive settings uniquement
		const screenSize: ScreenSize = isMobile ? "mobile" : "desktop";

		const responsiveSettings = getResponsiveSettings(responsive, screenSize, maxCount);
		const badgeAnimationClass = prefersReducedMotion ? "" : getBadgeAnimationClass(animationConfig);
		const popoverAnimationClass = prefersReducedMotion
			? ""
			: getPopoverAnimationClass(animationConfig);
		const animDuration = prefersReducedMotion ? 0 : (animationConfig?.duration ?? animation);
		const animDelay = prefersReducedMotion ? 0 : (animationConfig?.delay ?? 0);

		const getOptionByValue = (value: string): MultiSelectOption | undefined => {
			return allOptions.find((option) => option.value === value);
		};

		const filteredOptions = filterOptions(options, searchValue, searchable);

		const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				setIsPopoverOpen(true);
			} else if (event.key === "Backspace" && !event.currentTarget.value) {
				const newSelectedValues = [...selectedValues];
				newSelectedValues.pop();
				setSelectedValues(newSelectedValues);
				onValueChange(newSelectedValues);
			} else if (event.key === "Escape" && event.currentTarget.value) {
				// Escape progressif : clear search d'abord, ferme popover au 2e press
				event.preventDefault();
				event.stopPropagation();
				setSearchValue("");
				haptic("light");
			} else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
				// ⌘A / Ctrl+A : toggle all (desktop power-user shortcut)
				event.preventDefault();
				event.stopPropagation();
				toggleAll();
			}
		};

		const toggleOption = (optionValue: string) => {
			if (disabled) return;
			const option = getOptionByValue(optionValue);
			if (option?.disabled) return;
			const newSelectedValues = selectedValues.includes(optionValue)
				? selectedValues.filter((value) => value !== optionValue)
				: [...selectedValues, optionValue];
			setSelectedValues(newSelectedValues);
			onValueChange(newSelectedValues);
			haptic("selection");
			// Close only on explicit closeOnSelect prop (mobile uses batch mode with "Terminer" button)
			if (closeOnSelect) {
				setIsPopoverOpen(false);
			}
		};

		const handleClear = () => {
			if (disabled) return;
			setSelectedValues([]);
			onValueChange([]);
			haptic("light");
		};

		const handleTogglePopover = () => {
			if (disabled) return;
			haptic("selection");
			withViewTransition(() => setIsPopoverOpen((prev) => !prev));
		};

		const clearExtraOptions = () => {
			if (disabled) return;
			const newSelectedValues = selectedValues.slice(0, responsiveSettings.maxCount);
			setSelectedValues(newSelectedValues);
			onValueChange(newSelectedValues);
			haptic("light");
		};

		const toggleAll = () => {
			if (disabled) return;
			// P1 Fix: Use pre-computed isAllSelected and enabledOptions
			if (isAllSelected) {
				handleClear();
			} else {
				const allValues = enabledOptions.map((option) => option.value);
				setSelectedValues(allValues);
				onValueChange(allValues);
				haptic("light");
			}

			if (closeOnSelect) {
				setIsPopoverOpen(false);
			}
		};

		React.useEffect(() => {
			if (!resetOnDefaultValueChange) return;
			const prevDefaultValue = prevDefaultValueRef.current;
			if (!arraysEqual(prevDefaultValue, defaultValue)) {
				if (!arraysEqual(selectedValues, defaultValue)) {
					setSelectedValues(defaultValue);
				}
				prevDefaultValueRef.current = [...defaultValue];
			}
		}, [defaultValue, selectedValues, resetOnDefaultValueChange]);

		const widthConstraints = getWidthConstraints(screenSize, minWidth, maxWidth, autoSize);

		React.useEffect(() => {
			if (!isPopoverOpen) {
				setSearchValue("");
			}
		}, [isPopoverOpen]);

		// Focus restoration : snapshot activeElement à l'ouverture, restore au close via rAF + preventScroll
		React.useEffect(() => {
			if (isPopoverOpen) {
				previousFocusRef.current =
					typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
				return;
			}
			const previous = previousFocusRef.current;
			if (!previous) return;
			previousFocusRef.current = null;
			const id = requestAnimationFrame(() => {
				previous.focus({ preventScroll: true });
			});
			return () => cancelAnimationFrame(id);
		}, [isPopoverOpen]);

		// Effect 1: Annonces de selection
		React.useEffect(() => {
			const selectedCount = selectedValues.length;
			const totalOptions = enabledCount;

			if (selectedCount !== prevSelectedCount.current) {
				const diff = selectedCount - prevSelectedCount.current;
				if (diff > 0) {
					const addedItems = selectedValues.slice(-diff);
					const addedLabels = addedItems
						.map((value) => allOptions.find((opt) => opt.value === value)?.label)
						.filter(Boolean);

					if (addedLabels.length === 1) {
						announce(
							`${addedLabels[0]} sélectionné. ${selectedCount} sur ${totalOptions} options.`,
						);
					} else {
						announce(
							`${addedLabels.length} options ajoutées. ${selectedCount} sur ${totalOptions}.`,
						);
					}
				} else if (diff < 0) {
					announce(`Option retirée. ${selectedCount} sur ${totalOptions} options.`);
				}
				prevSelectedCount.current = selectedCount;
			}
		}, [selectedValues, allOptions, enabledCount]);

		// Effect 2: Annonces d'ouverture/fermeture
		React.useEffect(() => {
			if (isPopoverOpen !== prevIsOpen.current) {
				const totalOptions = enabledCount;
				if (isPopoverOpen) {
					announce(`Liste ouverte. ${totalOptions} options. Flèches pour naviguer.`);
				} else {
					announce("Liste fermée.");
				}
				prevIsOpen.current = isPopoverOpen;
			}
		}, [isPopoverOpen, allOptions, enabledCount]);

		// Effect 3: Annonces de recherche
		// P1 Fix: Use pre-computed filteredOptions instead of re-filtering
		React.useEffect(() => {
			if (searchValue !== prevSearchValue.current && searchValue && isPopoverOpen) {
				// Calculate count from already filtered options
				const filteredCount = isGroupedOptions(filteredOptions)
					? filteredOptions.reduce((acc, group) => acc + group.options.length, 0)
					: filteredOptions.length;
				announce(
					`${filteredCount} résultat${filteredCount === 1 ? "" : "s"} pour "${searchValue}"`,
				);
			}
			prevSearchValue.current = searchValue;
		}, [searchValue, isPopoverOpen, filteredOptions]);

		// Composant de rendu des options (réutilisé mobile/desktop)
		const renderCommandContent = () => (
			<>
				{searchable && (
					<div id={`${multiSelectId}-search-help`} className="sr-only">
						Tapez pour filtrer. Flèches pour naviguer.
					</div>
				)}
				<CommandList
					className={cn(
						"multiselect-scrollbar max-h-none flex-1 overflow-y-auto",
						"overscroll-behavior-y-contain",
					)}
				>
					{isLoading ? (
						<div
							className="flex items-center justify-center py-6"
							role="status"
							aria-busy="true"
							aria-label="Chargement des options"
						>
							<Spinner className="h-4 w-4" />
							<span className="text-muted-foreground ml-2 text-sm">Chargement...</span>
						</div>
					) : (
						<CommandEmpty className="py-8 text-center">
							{emptyIndicator ?? (
								<div className="flex flex-col items-center gap-2">
									<SearchX className="text-muted-foreground h-5 w-5" aria-hidden="true" />
									<p className="text-muted-foreground text-sm">
										{searchValue
											? `Aucun résultat pour "${searchValue}"`
											: "Aucune option disponible"}
									</p>
									{searchValue && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setSearchValue("");
												haptic("light");
											}}
											className="text-xs"
										>
											Effacer la recherche
										</Button>
									)}
								</div>
							)}
						</CommandEmpty>
					)}
					{!isLoading && !hideSelectAll && !searchValue && (
						<CommandGroup>
							<CommandItem
								key="all"
								onSelect={toggleAll}
								role="option"
								aria-selected={isAllSelected}
								aria-label={`Sélectionner les ${allOptions.length} options`}
								className="cursor-pointer py-3"
							>
								<div
									className={cn(
										"border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
										isAllSelected
											? "bg-primary text-primary-foreground"
											: "opacity-50 [&_svg]:invisible",
									)}
									aria-hidden="true"
								>
									<CheckIcon className="h-4 w-4" />
								</div>
								<span>
									(Tout sélectionner
									{allOptions.length > 20 ? ` - ${allOptions.length} éléments` : ""})
								</span>
							</CommandItem>
						</CommandGroup>
					)}
					{!isLoading &&
						(isGroupedOptions(filteredOptions) ? (
							filteredOptions.map((group) => (
								<CommandGroup key={group.heading} heading={group.heading}>
									{group.options.map((option) => {
										const isSelected = selectedValues.includes(option.value);
										return (
											<CommandItem
												key={option.value}
												onSelect={() => toggleOption(option.value)}
												role="option"
												aria-selected={isSelected}
												aria-disabled={option.disabled}
												aria-label={`${option.label}${
													isSelected ? ", sélectionné" : ", non sélectionné"
												}${option.disabled ? ", désactivé" : ""}`}
												className={cn(
													"cursor-pointer py-3",
													option.disabled && "cursor-not-allowed opacity-50",
												)}
												disabled={option.disabled}
											>
												<div
													className={cn(
														"border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
														isSelected
															? "bg-primary text-primary-foreground"
															: "opacity-50 [&_svg]:invisible",
													)}
													aria-hidden="true"
												>
													<CheckIcon className="h-4 w-4" />
												</div>
												{option.icon && (
													<option.icon
														className="text-muted-foreground mr-2 h-4 w-4"
														aria-hidden="true"
													/>
												)}
												<span>{option.label}</span>
											</CommandItem>
										);
									})}
								</CommandGroup>
							))
						) : (
							<CommandGroup>
								{filteredOptions.map((option) => {
									const isSelected = selectedValues.includes(option.value);
									return (
										<CommandItem
											key={option.value}
											onSelect={() => toggleOption(option.value)}
											role="option"
											aria-selected={isSelected}
											aria-disabled={option.disabled}
											aria-label={`${option.label}${
												isSelected ? ", sélectionné" : ", non sélectionné"
											}${option.disabled ? ", désactivé" : ""}`}
											className={cn(
												"cursor-pointer py-3",
												option.disabled && "cursor-not-allowed opacity-50",
											)}
											disabled={option.disabled}
										>
											<div
												className={cn(
													"border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
													isSelected
														? "bg-primary text-primary-foreground"
														: "opacity-50 [&_svg]:invisible",
												)}
												aria-hidden="true"
											>
												<CheckIcon className="h-4 w-4" />
											</div>
											{option.icon && (
												<option.icon
													className="text-muted-foreground mr-2 h-4 w-4"
													aria-hidden="true"
												/>
											)}
											<span>{option.label}</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
				</CommandList>
			</>
		);

		// Composant pour afficher les badges sélectionnés dans le trigger
		const renderTriggerContent = () => {
			if (selectedValues.length === 0) {
				return (
					<div className="mx-auto flex w-full items-center justify-between">
						<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
						<ChevronDown
							className={cn(
								"text-muted-foreground mx-2 h-4 cursor-pointer motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
								isPopoverOpen && "rotate-180",
							)}
						/>
					</div>
				);
			}

			return (
				<div className="flex w-full items-center justify-between">
					<div
						className={cn(
							"flex items-center gap-1",
							singleLine ? "multiselect-singleline-scroll overflow-x-auto" : "flex-wrap",
							responsiveSettings.compactMode && "gap-0.5",
						)}
						style={singleLine ? { paddingBottom: "4px" } : {}}
					>
						{selectedValues
							.slice(0, responsiveSettings.maxCount)
							.map((value) => {
								const option = getOptionByValue(value);
								const IconComponent = option?.icon;
								const customStyle = option?.style;
								if (!option) return null;

								const badgeStyle: React.CSSProperties = {
									animationDuration: `${animDuration}s`,
									...(customStyle?.badgeColor && {
										backgroundColor: customStyle.badgeColor,
									}),
									...(customStyle?.gradient && {
										background: customStyle.gradient,
										color: "white",
									}),
								};

								return (
									<Badge
										key={value}
										className={cn(
											badgeAnimationClass,
											multiSelectVariants({ variant }),
											customStyle?.gradient && "border-transparent text-white",
											responsiveSettings.compactMode && "px-1.5 py-0.5 text-xs",
											isMobile && "max-w-30 truncate",
											singleLine && "shrink-0 whitespace-nowrap",
											"[&>svg]:pointer-events-auto",
										)}
										style={{
											...badgeStyle,
											animationDuration: `${animDuration}s`,
											animationDelay: `${animDelay}s`,
										}}
									>
										{IconComponent && !responsiveSettings.hideIcons && (
											<IconComponent
												className={cn(
													"mr-2 h-4 w-4",
													responsiveSettings.compactMode && "mr-1 h-3 w-3",
													customStyle?.iconColor && "text-current",
												)}
												{...(customStyle?.iconColor && {
													style: { color: customStyle.iconColor },
												})}
											/>
										)}
										<span className={cn(isMobile && "truncate")}>{option.label}</span>
										<div
											role="button"
											tabIndex={0}
											onClick={(event) => {
												event.stopPropagation();
												toggleOption(value);
											}}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													event.stopPropagation();
													toggleOption(value);
												}
											}}
											aria-label={`Retirer ${option.label} de la sélection`}
											className={cn(
												"hover:bg-foreground/20 focus-visible:ring-foreground/50 -mr-1 ml-1 flex cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden",
												isMobile ? "h-10 w-10" : "h-8 w-8",
											)}
										>
											<CircleX
												className={cn("h-3 w-3", responsiveSettings.compactMode && "h-2.5 w-2.5")}
											/>
										</div>
									</Badge>
								);
							})
							.filter(Boolean)}
						{selectedValues.length > responsiveSettings.maxCount && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										className={cn(
											"text-foreground border-foreground/1 bg-transparent hover:bg-transparent",
											badgeAnimationClass,
											multiSelectVariants({ variant }),
											responsiveSettings.compactMode && "px-1.5 py-0.5 text-xs",
											singleLine && "shrink-0 whitespace-nowrap",
											"[&>svg]:pointer-events-auto",
										)}
										style={{
											animationDuration: `${animDuration}s`,
											animationDelay: `${animDelay}s`,
										}}
									>
										{`+ ${selectedValues.length - responsiveSettings.maxCount} de plus`}
										<div
											role="button"
											tabIndex={0}
											onClick={(event) => {
												event.stopPropagation();
												clearExtraOptions();
											}}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													event.stopPropagation();
													clearExtraOptions();
												}
											}}
											aria-label={`Retirer les ${selectedValues.length - responsiveSettings.maxCount} options supplémentaires`}
											className={cn(
												"hover:bg-foreground/20 focus-visible:ring-foreground/50 flex cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden",
												isMobile ? "ml-2 h-10 w-10" : "ml-2 h-8 w-8",
											)}
										>
											<CircleX
												className={cn("h-4 w-4", responsiveSettings.compactMode && "h-3 w-3")}
											/>
										</div>
									</Badge>
								</TooltipTrigger>
								<TooltipContent
									side="bottom"
									className="max-w-50"
									collisionPadding={8}
									avoidCollisions
								>
									<ul className="space-y-0.5 text-xs">
										{selectedValues
											.slice(responsiveSettings.maxCount)
											.map((value) => allOptions.find((o) => o.value === value))
											.filter(Boolean)
											.map((opt) => (
												<li key={opt!.value}>{opt!.label}</li>
											))}
									</ul>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
					<div className="flex items-center justify-between">
						<div
							role="button"
							tabIndex={0}
							onClick={(event) => {
								event.stopPropagation();
								handleClear();
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									event.stopPropagation();
									handleClear();
								}
							}}
							aria-label={`Effacer les ${selectedValues.length} options sélectionnées`}
							className={cn(
								"text-muted-foreground hover:text-foreground focus:ring-ring mx-2 flex cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:ring-offset-1 focus:outline-hidden",
								isMobile ? "h-10 w-10" : "h-8 w-8",
							)}
						>
							<XIcon className="h-4 w-4" />
						</div>
						<Separator orientation="vertical" className="flex h-full min-h-6" />
						<ChevronDown
							className={cn(
								"text-muted-foreground mx-2 h-4 cursor-pointer motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
								isPopoverOpen && "rotate-180",
							)}
							aria-hidden="true"
						/>
					</div>
				</div>
			);
		};

		// ========================================
		// VERSION MOBILE - Drawer fullscreen
		// ========================================
		if (isMobile) {
			return (
				<>
					{/* Live regions pour accessibilité */}
					<div className="sr-only">
						<div aria-live="polite" aria-atomic="true" role="status">
							{politeMessage}
						</div>
						<div aria-live="assertive" aria-atomic="true" role="alert">
							{assertiveMessage}
						</div>
					</div>

					<div id={triggerDescriptionId} className="sr-only">
						Sélection multiple. Utilisez les flèches pour naviguer, Entrée pour sélectionner, Échap
						pour fermer.
					</div>
					<div id={selectedCountId} className="sr-only" aria-live="polite">
						{selectedValues.length === 0
							? "Aucune option sélectionnée"
							: `${selectedValues.length} option${
									selectedValues.length === 1 ? "" : "s"
								} sélectionnée${selectedValues.length === 1 ? "" : "s"} : ${selectedValues
									.map((value) => getOptionByValue(value)?.label)
									.filter(Boolean)
									.join(", ")}`}
					</div>

					{/* Trigger button */}
					<Button
						ref={buttonRef}
						{...props}
						onClick={() => {
							if (disabled) return;
							haptic("selection");
							withViewTransition(() => setIsPopoverOpen(true));
						}}
						disabled={disabled}
						role="combobox"
						aria-expanded={isPopoverOpen}
						aria-haspopup="listbox"
						aria-controls={isPopoverOpen ? listboxId : undefined}
						aria-describedby={[triggerDescriptionId, selectedCountId, externalAriaDescribedBy]
							.filter(Boolean)
							.join(" ")}
						aria-label={`Sélection multiple : ${selectedValues.length} sur ${allOptions.length} options sélectionnées. ${placeholder}`}
						className={cn(
							"flex h-auto min-h-11 touch-manipulation items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto",
							autoSize ? "w-auto" : "w-full",
							disabled && "cursor-not-allowed opacity-50",
							className,
						)}
						style={{
							...widthConstraints,
							maxWidth: `min(${widthConstraints.maxWidth}, 100%)`,
						}}
					>
						{renderTriggerContent()}
					</Button>

					{/* Drawer bottom — primitive gère rounded-t-xl, safe-area-bottom, DrawerHandle auto */}
					<Drawer open={isPopoverOpen} onOpenChange={setIsPopoverOpen} direction="bottom">
						<DrawerContent className="flex max-h-[95dvh] min-h-[70dvh] flex-col">
							<DrawerTitle className="sr-only">Sélection</DrawerTitle>

							{/* Header sticky avec retour + recherche */}
							<div className="bg-background sticky top-0 flex items-center gap-2 border-b px-3 py-3">
								<DrawerClose asChild>
									<button
										type="button"
										className="hover:bg-muted text-muted-foreground hover:text-foreground -ml-1 grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full transition-colors"
										aria-label="Fermer"
									>
										<ArrowLeftIcon className="size-5" />
									</button>
								</DrawerClose>
								{searchable && (
									<div className="flex-1">
										<Command className="rounded-none border-none">
											<CommandInput
												placeholder="Rechercher..."
												onKeyDown={handleInputKeyDown}
												value={searchValue}
												onValueChange={setSearchValue}
												aria-label="Rechercher parmi les options"
												aria-describedby={`${multiSelectId}-search-help`}
												inputMode="search"
												enterKeyHint="search"
												autoCapitalize="off"
												autoCorrect="off"
												spellCheck={false}
												data-vaul-no-drag
												className="h-10"
											/>
										</Command>
									</div>
								)}
							</div>

							{/* Liste scrollable */}
							<Command className="flex flex-1 flex-col overflow-hidden">
								{renderCommandContent()}
							</Command>

							{/* Footer sticky avec actions — safe-area bottom géré par DrawerContent primitive */}
							<div className="bg-background sticky bottom-0 flex gap-2 border-t p-3">
								{selectedValues.length > 0 && (
									<Button variant="outline" onClick={handleClear} className="min-h-11 flex-1">
										Effacer
									</Button>
								)}
								<Button
									onClick={() => {
										haptic("medium");
										setIsPopoverOpen(false);
									}}
									className="min-h-11 flex-1"
								>
									Terminer la sélection
								</Button>
							</div>
						</DrawerContent>
					</Drawer>
				</>
			);
		}

		// ========================================
		// VERSION DESKTOP - Popover classique
		// ========================================
		return (
			<>
				<div className="sr-only">
					<div aria-live="polite" aria-atomic="true" role="status">
						{politeMessage}
					</div>
					<div aria-live="assertive" aria-atomic="true" role="alert">
						{assertiveMessage}
					</div>
				</div>

				<Popover
					data-slot="multi-select"
					open={isPopoverOpen}
					onOpenChange={setIsPopoverOpen}
					modal={modalPopover}
				>
					<div id={triggerDescriptionId} className="sr-only">
						Sélection multiple. Utilisez les flèches pour naviguer, Entrée pour sélectionner, Échap
						pour fermer.
					</div>
					<div id={selectedCountId} className="sr-only" aria-live="polite">
						{selectedValues.length === 0
							? "Aucune option sélectionnée"
							: `${selectedValues.length} option${
									selectedValues.length === 1 ? "" : "s"
								} sélectionnée${selectedValues.length === 1 ? "" : "s"} : ${selectedValues
									.map((value) => getOptionByValue(value)?.label)
									.filter(Boolean)
									.join(", ")}`}
					</div>

					<PopoverTrigger asChild>
						<Button
							ref={buttonRef}
							{...props}
							onClick={handleTogglePopover}
							disabled={disabled}
							role="combobox"
							aria-expanded={isPopoverOpen}
							aria-haspopup="listbox"
							aria-controls={isPopoverOpen ? listboxId : undefined}
							aria-describedby={[triggerDescriptionId, selectedCountId, externalAriaDescribedBy]
								.filter(Boolean)
								.join(" ")}
							aria-label={`Sélection multiple : ${selectedValues.length} sur ${allOptions.length} options sélectionnées. ${placeholder}`}
							className={cn(
								"flex h-auto min-h-11 touch-manipulation items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto",
								autoSize ? "w-auto" : "w-full",
								responsiveSettings.compactMode && "min-h-9 text-sm",
								disabled && "cursor-not-allowed opacity-50",
								className,
							)}
							style={{
								...widthConstraints,
								maxWidth: `min(${widthConstraints.maxWidth}, 100%)`,
							}}
						>
							{renderTriggerContent()}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						id={listboxId}
						role="listbox"
						aria-multiselectable="true"
						aria-label="Options disponibles"
						className={cn("flex min-w-75 flex-col p-0", popoverAnimationClass, popoverClassName)}
						style={{
							animationDuration: `${animDuration}s`,
							animationDelay: `${animDelay}s`,
							maxWidth: `min(${widthConstraints.maxWidth}, 85vw)`,
							maxHeight: "60vh",
						}}
						align="start"
						sideOffset={4}
						collisionPadding={8}
						avoidCollisions
						onEscapeKeyDown={(event) => {
							// Escape progressif : si search rempli, clear d'abord (géré dans handleInputKeyDown) ;
							// sinon, fermeture native du popover via Radix.
							if (searchValue) {
								event.preventDefault();
								setSearchValue("");
								haptic("light");
								return;
							}
							setIsPopoverOpen(false);
						}}
					>
						<Command className="flex flex-1 flex-col overflow-hidden">
							{searchable && (
								<CommandInput
									placeholder="Rechercher..."
									onKeyDown={handleInputKeyDown}
									value={searchValue}
									onValueChange={setSearchValue}
									aria-label="Rechercher parmi les options"
									aria-describedby={`${multiSelectId}-search-help`}
									inputMode="search"
									enterKeyHint="search"
									autoCapitalize="off"
									autoCorrect="off"
									spellCheck={false}
									// eslint-disable-next-line jsx-a11y/no-autofocus
									autoFocus
								/>
							)}
							{renderCommandContent()}
							{selectedValues.length > 0 && (
								<div className="bg-popover sticky bottom-0 flex gap-1 border-t p-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											handleClear();
										}}
										className="flex-1"
										aria-label="Effacer toutes les options sélectionnées"
									>
										Effacer
									</Button>
									<Separator orientation="vertical" className="h-auto" />
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											haptic("selection");
											setIsPopoverOpen(false);
										}}
										className="flex-1"
										aria-label="Fermer la liste d'options"
									>
										Fermer
									</Button>
								</div>
							)}
						</Command>
					</PopoverContent>
				</Popover>
			</>
		);
	},
);

MultiSelect.displayName = "MultiSelect";
