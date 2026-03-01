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
	CommandSeparator,
} from "@/shared/components/ui/command";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/shared/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { Spinner } from "@/shared/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { ArrowLeftIcon, CheckIcon, ChevronDown, XCircle, XIcon } from "lucide-react";
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
		const badgeAnimationClass = getBadgeAnimationClass(animationConfig);
		const popoverAnimationClass = getPopoverAnimationClass(animationConfig);

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
			// Close only on explicit closeOnSelect prop (mobile uses batch mode with "Terminer" button)
			if (closeOnSelect) {
				setIsPopoverOpen(false);
			}
		};

		const handleClear = () => {
			if (disabled) return;
			setSelectedValues([]);
			onValueChange([]);
		};

		const handleTogglePopover = () => {
			if (disabled) return;
			setIsPopoverOpen((prev) => !prev);
		};

		const clearExtraOptions = () => {
			if (disabled) return;
			const newSelectedValues = selectedValues.slice(0, responsiveSettings.maxCount);
			setSelectedValues(newSelectedValues);
			onValueChange(newSelectedValues);
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
						<CommandEmpty>
							{emptyIndicator ||
								(searchValue ? `Aucun résultat pour "${searchValue}"` : "Aucune option disponible")}
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
								"text-muted-foreground mx-2 h-4 cursor-pointer transition-transform duration-200",
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
									animationDuration: `${animation}s`,
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
											animationDuration: `${animationConfig?.duration || animation}s`,
											animationDelay: `${animationConfig?.delay || 0}s`,
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
												"-mr-1 ml-1 flex cursor-pointer items-center justify-center rounded-sm hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-hidden",
												isMobile ? "h-10 w-10" : "h-6 w-6",
											)}
										>
											<XCircle
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
											animationDuration: `${animationConfig?.duration || animation}s`,
											animationDelay: `${animationConfig?.delay || 0}s`,
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
												"flex cursor-pointer items-center justify-center rounded-sm hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-hidden",
												isMobile ? "ml-2 h-10 w-10" : "ml-2 h-6 w-6",
											)}
										>
											<XCircle
												className={cn("h-4 w-4", responsiveSettings.compactMode && "h-3 w-3")}
											/>
										</div>
									</Badge>
								</TooltipTrigger>
								<TooltipContent side="bottom" className="max-w-50">
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
								isMobile ? "h-10 w-10" : "h-6 w-6",
							)}
						>
							<XIcon className="h-4 w-4" />
						</div>
						<Separator orientation="vertical" className="flex h-full min-h-6" />
						<ChevronDown
							className={cn(
								"text-muted-foreground mx-2 h-4 cursor-pointer transition-transform duration-200",
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
						onClick={() => !disabled && setIsPopoverOpen(true)}
						disabled={disabled}
						role="combobox"
						aria-expanded={isPopoverOpen}
						aria-haspopup="listbox"
						aria-controls={isPopoverOpen ? listboxId : undefined}
						aria-describedby={`${triggerDescriptionId} ${selectedCountId}`}
						aria-label={`Sélection multiple : ${selectedValues.length} sur ${allOptions.length} options sélectionnées. ${placeholder}`}
						className={cn(
							"flex h-auto min-h-11 items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto",
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

					{/* Drawer fullscreen */}
					<Drawer open={isPopoverOpen} onOpenChange={setIsPopoverOpen} direction="bottom">
						<DrawerContent className="flex max-h-[100dvh] min-h-[100dvh] flex-col rounded-none">
							<DrawerTitle className="sr-only">Sélection</DrawerTitle>

							{/* Header sticky avec retour + recherche */}
							<div className="bg-background sticky top-0 flex items-center gap-2 border-b px-3 py-3">
								<DrawerClose asChild>
									<button
										type="button"
										className="hover:bg-muted -ml-2 shrink-0 rounded-full p-2 transition-colors"
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
												// eslint-disable-next-line jsx-a11y/no-autofocus
												autoFocus
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

							{/* Footer sticky avec actions */}
							<div className="bg-background sticky bottom-0 flex gap-2 border-t p-3">
								{selectedValues.length > 0 && (
									<Button variant="outline" onClick={handleClear} className="flex-1">
										Effacer
									</Button>
								)}
								<Button onClick={() => setIsPopoverOpen(false)} className="flex-1">
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
							aria-describedby={`${triggerDescriptionId} ${selectedCountId}`}
							aria-label={`Sélection multiple : ${selectedValues.length} sur ${allOptions.length} options sélectionnées. ${placeholder}`}
							className={cn(
								"flex h-auto min-h-11 items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto",
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
							{selectedValues.length > 0 ? (
								<div className="flex w-full items-center justify-between">
									<div
										className={cn(
											"flex items-center gap-1",
											singleLine ? "multiselect-singleline-scroll overflow-x-auto" : "flex-wrap",
											responsiveSettings.compactMode && "gap-0.5",
										)}
										style={
											singleLine
												? {
														paddingBottom: "4px",
													}
												: {}
										}
									>
										{selectedValues
											.slice(0, responsiveSettings.maxCount)
											.map((value) => {
												const option = getOptionByValue(value);
												const IconComponent = option?.icon;
												const customStyle = option?.style;
												if (!option) {
													return null;
												}
												const badgeStyle: React.CSSProperties = {
													animationDuration: `${animation}s`,
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
															singleLine && "shrink-0 whitespace-nowrap",
															"[&>svg]:pointer-events-auto",
														)}
														style={{
															...badgeStyle,
															animationDuration: `${animationConfig?.duration || animation}s`,
															animationDelay: `${animationConfig?.delay || 0}s`,
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
														<span>{option.label}</span>
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
															className="-mr-1 ml-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-hidden"
														>
															<XCircle
																className={cn(
																	"h-3 w-3",
																	responsiveSettings.compactMode && "h-2.5 w-2.5",
																)}
															/>
														</div>
													</Badge>
												);
											})
											.filter(Boolean)}
										{selectedValues.length > responsiveSettings.maxCount &&
											(() => {
												const overflowCount = selectedValues.length - responsiveSettings.maxCount;
												const overflowItems = selectedValues
													.slice(responsiveSettings.maxCount)
													.map((value) => allOptions.find((o) => o.value === value))
													.filter(Boolean);

												return (
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
																	animationDuration: `${animationConfig?.duration || animation}s`,
																	animationDelay: `${animationConfig?.delay || 0}s`,
																}}
															>
																{`+ ${overflowCount} de plus`}
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
																	aria-label={`Retirer les ${overflowCount} options supplémentaires`}
																	className="ml-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-hidden"
																>
																	<XCircle
																		className={cn(
																			"h-4 w-4",
																			responsiveSettings.compactMode && "h-3 w-3",
																		)}
																	/>
																</div>
															</Badge>
														</TooltipTrigger>
														<TooltipContent side="bottom" className="max-w-50">
															<ul className="space-y-0.5 text-xs">
																{overflowItems.map((opt) => (
																	<li key={opt!.value}>{opt!.label}</li>
																))}
															</ul>
														</TooltipContent>
													</Tooltip>
												);
											})()}
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
											className="text-muted-foreground hover:text-foreground focus:ring-ring mx-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:ring-offset-1 focus:outline-hidden"
										>
											<XIcon className="h-4 w-4" />
										</div>
										<Separator orientation="vertical" className="flex h-full min-h-6" />
										<ChevronDown
											className={cn(
												"text-muted-foreground mx-2 h-4 cursor-pointer transition-transform duration-200",
												isPopoverOpen && "rotate-180",
											)}
											aria-hidden="true"
										/>
									</div>
								</div>
							) : (
								<div className="mx-auto flex w-full items-center justify-between">
									<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
									<ChevronDown
										className={cn(
											"text-muted-foreground mx-2 h-4 cursor-pointer transition-transform duration-200",
											isPopoverOpen && "rotate-180",
										)}
									/>
								</div>
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						id={listboxId}
						role="listbox"
						aria-multiselectable="true"
						aria-label="Options disponibles"
						className={cn("w-auto min-w-75 p-0", popoverAnimationClass, popoverClassName)}
						style={{
							animationDuration: `${animationConfig?.duration || animation}s`,
							animationDelay: `${animationConfig?.delay || 0}s`,
							maxWidth: `min(${widthConstraints.maxWidth}, 85vw)`,
							maxHeight: "60vh",
						}}
						align="start"
						onEscapeKeyDown={() => setIsPopoverOpen(false)}
					>
						<Command>
							{searchable && (
								<CommandInput
									placeholder="Rechercher..."
									onKeyDown={handleInputKeyDown}
									value={searchValue}
									onValueChange={setSearchValue}
									aria-label="Rechercher parmi les options"
									aria-describedby={`${multiSelectId}-search-help`}
									// eslint-disable-next-line jsx-a11y/no-autofocus
									autoFocus
								/>
							)}
							{searchable && (
								<div id={`${multiSelectId}-search-help`} className="sr-only">
									Tapez pour filtrer. Flèches pour naviguer.
								</div>
							)}
							<CommandList className="multiselect-scrollbar overscroll-behavior-y-contain max-h-[40vh] overflow-y-auto">
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
									<CommandEmpty>
										{emptyIndicator ||
											(searchValue
												? `Aucun résultat pour "${searchValue}"`
												: "Aucune option disponible")}
									</CommandEmpty>
								)}{" "}
								{!isLoading && !hideSelectAll && !searchValue && (
									<CommandGroup>
										<CommandItem
											key="all"
											onSelect={toggleAll}
											role="option"
											aria-selected={isAllSelected}
											aria-label={`Sélectionner les ${allOptions.length} options`}
											className="cursor-pointer"
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
																"cursor-pointer",
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
															"cursor-pointer",
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
								<CommandSeparator />
								<CommandGroup>
									<div className="flex items-center justify-between">
										{selectedValues.length > 0 && (
											<>
												<CommandItem
													onSelect={handleClear}
													className="flex-1 cursor-pointer justify-center"
													aria-label="Effacer toutes les options sélectionnées"
												>
													Effacer
												</CommandItem>
												<Separator orientation="vertical" className="flex h-full min-h-6" />
											</>
										)}
										<CommandItem
											onSelect={() => setIsPopoverOpen(false)}
											className="max-w-full flex-1 cursor-pointer justify-center"
											aria-label="Fermer la liste d'options"
										>
											Fermer
										</CommandItem>
									</div>
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</>
		);
	},
);

MultiSelect.displayName = "MultiSelect";
