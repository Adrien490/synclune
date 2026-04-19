"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/view-transition";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";
import { MULTI_SELECT_LABELS as L, multiSelectVariants } from "./constants";
import type { MultiSelectOption, MultiSelectProps, MultiSelectRef } from "./types";

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return sortedA.every((val, index) => val === sortedB[index]);
}

export const MultiSelect = React.forwardRef<MultiSelectRef, MultiSelectProps>(
	(
		{
			options,
			onValueChange,
			defaultValue = [],
			placeholder = L.placeholder,
			maxCount = 3,
			hideSelectAll = false,
			disabled = false,
			variant,
			className,
			"aria-describedby": externalAriaDescribedBy,
			...props
		},
		ref,
	) => {
		const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
		const [isOpen, setIsOpen] = React.useState(false);
		const [politeMessage, setPoliteMessage] = React.useState("");

		const isMobileDetected = useIsMobile();
		const mounted = useMounted();
		const isMobile = mounted && isMobileDetected;

		const haptic = useHaptic();

		const triggerRef = React.useRef<HTMLButtonElement>(null);
		const previousFocusRef = React.useRef<HTMLElement | null>(null);
		const prevDefaultValueRef = React.useRef<string[]>(defaultValue);

		const enabledOptions = options.filter((o) => !o.disabled);
		const enabledCount = enabledOptions.length;
		const totalCount = options.length;
		const isAllSelected = selectedValues.length > 0 && selectedValues.length === enabledCount;

		const uid = React.useId();
		const listboxId = `${uid}-listbox`;
		const countId = `${uid}-count`;
		const describedById = `${uid}-desc`;

		const getOptionByValue = (value: string): MultiSelectOption | undefined =>
			options.find((o) => o.value === value);

		const announce = (message: string) => setPoliteMessage(message);

		React.useEffect(() => {
			if (!politeMessage) return;
			const id = setTimeout(() => setPoliteMessage(""), 1200);
			return () => clearTimeout(id);
		}, [politeMessage]);

		React.useEffect(() => {
			const prev = prevDefaultValueRef.current;
			if (arraysEqual(prev, defaultValue)) return;
			prevDefaultValueRef.current = [...defaultValue];
			if (!arraysEqual(selectedValues, defaultValue)) {
				setSelectedValues(defaultValue);
			}
		}, [defaultValue, selectedValues]);

		React.useEffect(() => {
			if (isOpen) {
				previousFocusRef.current =
					typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
				announce(L.ariaListOpen(enabledCount));
				return;
			}
			announce(L.ariaListClosed);
			const previous = previousFocusRef.current;
			if (!previous) return;
			previousFocusRef.current = null;
			const id = requestAnimationFrame(() => previous.focus({ preventScroll: true }));
			return () => cancelAnimationFrame(id);
		}, [isOpen, enabledCount]);

		React.useImperativeHandle(
			ref,
			() => ({
				reset: () => {
					setSelectedValues(defaultValue);
					setIsOpen(false);
					onValueChange(defaultValue);
				},
				clear: () => {
					setSelectedValues([]);
					onValueChange([]);
				},
				focus: () => triggerRef.current?.focus(),
				getValues: () => selectedValues,
				setValues: (values) => {
					setSelectedValues(values);
					onValueChange(values);
				},
			}),
			[defaultValue, selectedValues, onValueChange],
		);

		const commit = (values: string[]) => {
			setSelectedValues(values);
			onValueChange(values);
		};

		const toggleOption = (value: string) => {
			if (disabled) return;
			const option = getOptionByValue(value);
			if (option?.disabled) return;
			const next = selectedValues.includes(value)
				? selectedValues.filter((v) => v !== value)
				: [...selectedValues, value];
			commit(next);
			haptic("selection");
			if (option) {
				if (next.includes(value)) {
					announce(L.ariaSelected(option.label, next.length, enabledCount));
				} else {
					announce(L.ariaRemoved(next.length, enabledCount));
				}
			}
		};

		const handleClear = () => {
			if (disabled || selectedValues.length === 0) return;
			commit([]);
			haptic("light");
		};

		const toggleAll = () => {
			if (disabled) return;
			if (isAllSelected) {
				commit([]);
			} else {
				commit(enabledOptions.map((o) => o.value));
			}
			haptic("selection");
		};

		const handleToggleOpen = () => {
			if (disabled) return;
			haptic("selection");
			withViewTransition(() => setIsOpen((prev) => !prev));
		};

		const handleOpen = () => {
			if (disabled) return;
			haptic("selection");
			withViewTransition(() => setIsOpen(true));
		};

		const handleFinish = () => {
			haptic("medium");
			setIsOpen(false);
		};

		const handleOverlayDismiss = () => {
			haptic("light");
		};

		const clearExtraOptions = () => {
			if (disabled) return;
			commit(selectedValues.slice(0, maxCount));
			haptic("light");
		};

		// =========================================================================
		// Trigger (shared)
		// =========================================================================
		const triggerCommonProps = {
			ref: triggerRef,
			disabled,
			role: "combobox" as const,
			"aria-expanded": isOpen,
			"aria-haspopup": "listbox" as const,
			"aria-controls": isOpen ? listboxId : undefined,
			"aria-describedby":
				[describedById, countId, externalAriaDescribedBy].filter(Boolean).join(" ") || undefined,
			"aria-label": L.ariaComboboxLabel(selectedValues.length, totalCount, placeholder),
			className: cn(
				"flex h-auto min-h-11 w-full touch-manipulation items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit",
				"[&_svg]:pointer-events-auto",
				disabled && "cursor-not-allowed opacity-50",
				className,
			),
			...props,
		};

		const triggerContent =
			selectedValues.length === 0 ? (
				<div className="flex w-full items-center justify-between">
					<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
					<ChevronDown
						className={cn(
							"text-muted-foreground mx-2 size-4 motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
							isOpen && "rotate-180",
						)}
						aria-hidden="true"
					/>
				</div>
			) : (
				<div className="flex w-full items-center justify-between gap-1">
					<div
						className={cn(
							"flex flex-1 items-center gap-1",
							isMobile ? "multiselect-singleline-scroll overflow-x-auto" : "flex-wrap",
						)}
					>
						{selectedValues
							.slice(0, maxCount)
							.map((value) => {
								const option = getOptionByValue(value);
								if (!option) return null;
								const Icon = option.icon;
								return (
									<Badge
										key={value}
										className={cn(
											multiSelectVariants({ variant }),
											"shrink-0 whitespace-nowrap [&>svg]:pointer-events-auto",
											isMobile && "max-w-32 truncate",
										)}
									>
										{Icon && (
											<Icon className="text-muted-foreground mr-1 size-3.5" aria-hidden="true" />
										)}
										<span className={cn("truncate")}>{option.label}</span>
										<div
											role="button"
											tabIndex={disabled ? -1 : 0}
											onClick={(e) => {
												e.stopPropagation();
												toggleOption(value);
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													e.stopPropagation();
													toggleOption(value);
												}
											}}
											aria-label={L.removeItem(option.label)}
											className={cn(
												"hover:bg-foreground/20 focus-visible:ring-foreground/50 ml-1 flex cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden",
												isMobile
													? "relative -mr-1 size-8 touch-manipulation after:absolute after:-inset-2 after:content-['']"
													: "-mr-1 size-6",
											)}
										>
											<X className="size-3" aria-hidden="true" />
										</div>
									</Badge>
								);
							})
							.filter(Boolean)}

						{selectedValues.length > maxCount && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										className={cn(
											multiSelectVariants({ variant }),
											"text-foreground border-foreground/10 shrink-0 bg-transparent whitespace-nowrap hover:bg-transparent [&>svg]:pointer-events-auto",
										)}
									>
										{L.moreItems(selectedValues.length - maxCount)}
										<div
											role="button"
											tabIndex={disabled ? -1 : 0}
											onClick={(e) => {
												e.stopPropagation();
												clearExtraOptions();
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													e.stopPropagation();
													clearExtraOptions();
												}
											}}
											aria-label={L.removeExtra(selectedValues.length - maxCount)}
											className={cn(
												"hover:bg-foreground/20 focus-visible:ring-foreground/50 ml-1 flex cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden",
												isMobile
													? "relative -mr-1 size-8 touch-manipulation after:absolute after:-inset-2 after:content-['']"
													: "-mr-1 size-6",
											)}
										>
											<X className="size-3" aria-hidden="true" />
										</div>
									</Badge>
								</TooltipTrigger>
								<TooltipContent
									side="bottom"
									className="max-w-60"
									collisionPadding={8}
									avoidCollisions
								>
									<ul className="space-y-0.5 text-xs">
										{selectedValues
											.slice(maxCount)
											.map((v) => getOptionByValue(v))
											.filter(Boolean)
											.map((opt) => (
												<li key={opt!.value}>{opt!.label}</li>
											))}
									</ul>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
					<div className="flex shrink-0 items-center">
						<div
							role="button"
							tabIndex={disabled ? -1 : 0}
							onClick={(e) => {
								e.stopPropagation();
								handleClear();
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									handleClear();
								}
							}}
							aria-label={L.clearSelection(selectedValues.length)}
							className={cn(
								"text-muted-foreground hover:text-foreground focus:ring-ring mx-1 flex cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:ring-offset-1 focus:outline-hidden",
								isMobile ? "size-10" : "size-8",
							)}
						>
							<X className="size-4" aria-hidden="true" />
						</div>
						<Separator orientation="vertical" className="h-6" />
						<ChevronDown
							className={cn(
								"text-muted-foreground mx-2 size-4 motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
								isOpen && "rotate-180",
							)}
							aria-hidden="true"
						/>
					</div>
				</div>
			);

		// =========================================================================
		// Option list (shared markup, wrapped by Popover or Drawer)
		// =========================================================================
		const renderOptionRow = (option: MultiSelectOption, sizeClass: string) => {
			const isSelected = selectedValues.includes(option.value);
			const Icon = option.icon;
			return (
				<label
					key={option.value}
					className={cn(
						"group relative flex cursor-pointer touch-manipulation items-center gap-3 rounded-md px-3",
						"motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]",
						"hover:bg-accent focus-within:bg-accent",
						isSelected && "bg-accent/60",
						option.disabled && "cursor-not-allowed opacity-50",
						sizeClass,
					)}
				>
					<Checkbox
						checked={isSelected}
						disabled={option.disabled}
						onCheckedChange={() => toggleOption(option.value)}
						aria-label={option.label}
						className="pointer-events-none"
					/>
					{Icon && <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />}
					<span className="flex-1 truncate text-sm">{option.label}</span>
				</label>
			);
		};

		const selectAllRow = !hideSelectAll && enabledCount > 0 && (
			<label
				className={cn(
					"group relative flex cursor-pointer touch-manipulation items-center gap-3 rounded-md border-b px-3",
					"motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]",
					"hover:bg-accent focus-within:bg-accent",
					isMobile ? "min-h-14" : "min-h-11",
				)}
			>
				<Checkbox
					checked={isAllSelected ? true : selectedValues.length > 0 ? "indeterminate" : false}
					onCheckedChange={toggleAll}
					aria-label={L.ariaSelectAllOptions(enabledCount)}
					className="pointer-events-none"
				/>
				<span className="flex-1 text-sm font-medium">{L.selectAll}</span>
				<span className="text-muted-foreground text-xs tabular-nums">
					{selectedValues.length}/{enabledCount}
				</span>
			</label>
		);

		const emptyState = (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground text-sm">{L.noOptions}</p>
			</div>
		);

		// =========================================================================
		// Live regions + hidden descriptions (shared)
		// =========================================================================
		const a11yRegion = (
			<>
				<div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
					{politeMessage}
				</div>
				<div id={describedById} className="sr-only">
					Sélection multiple. Sélectionnez une ou plusieurs options, puis fermez la liste.
				</div>
				<div id={countId} className="sr-only" aria-live="polite">
					{selectedValues.length === 0
						? L.ariaNoSelection
						: `${L.selectionCount(selectedValues.length)} : ${selectedValues
								.map((v) => getOptionByValue(v)?.label)
								.filter(Boolean)
								.join(", ")}`}
				</div>
			</>
		);

		// =========================================================================
		// MOBILE — Drawer bottom
		// =========================================================================
		if (isMobile) {
			const hasPendingAnnouncement = isOpen && politeMessage.length > 0;
			return (
				<>
					{a11yRegion}
					<Button {...triggerCommonProps} onClick={handleOpen}>
						{triggerContent}
					</Button>

					<Drawer
						open={isOpen}
						onOpenChange={setIsOpen}
						direction="bottom"
						snapPoints={[0.5, 0.92]}
					>
						<DrawerContent
							className="max-h-[92dvh]"
							onOverlayClick={handleOverlayDismiss}
							data-pending={hasPendingAnnouncement ? "true" : undefined}
							aria-busy={hasPendingAnnouncement || undefined}
						>
							<DrawerHeader className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 shrink-0 border-b pr-12 backdrop-blur-sm">
								<DrawerTitle>{placeholder}</DrawerTitle>
								<p className="text-muted-foreground text-sm">
									{selectedValues.length === 0
										? L.ariaNoSelection
										: L.selectionCount(selectedValues.length)}
								</p>
								<DrawerClose asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={L.ariaCloseDrawer}
										className="absolute top-2 right-2 size-11 rounded-full"
									>
										<X className="size-5" aria-hidden="true" />
									</Button>
								</DrawerClose>
							</DrawerHeader>

							<DrawerBody
								id={listboxId}
								role="listbox"
								aria-multiselectable="true"
								aria-label={L.ariaOptionsLabel}
								className="flex flex-col gap-1 overscroll-contain py-2"
							>
								{options.length === 0 ? (
									emptyState
								) : (
									<>
										{selectAllRow}
										{options.map((option) => renderOptionRow(option, "min-h-14"))}
									</>
								)}
							</DrawerBody>

							<DrawerFooter className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 shrink-0 flex-row gap-2 border-t py-3 backdrop-blur-sm">
								{selectedValues.length > 0 && (
									<Button
										type="button"
										variant="outline"
										onClick={handleClear}
										className="min-h-14 flex-1"
									>
										{L.clearAll}
									</Button>
								)}
								<Button type="button" onClick={handleFinish} className="min-h-14 flex-1">
									{L.finish}
								</Button>
							</DrawerFooter>
						</DrawerContent>
					</Drawer>
				</>
			);
		}

		// =========================================================================
		// DESKTOP — Popover
		// =========================================================================
		return (
			<>
				{a11yRegion}
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<Button {...triggerCommonProps} onClick={handleToggleOpen}>
							{triggerContent}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						id={listboxId}
						role="listbox"
						aria-multiselectable="true"
						aria-label={L.ariaOptionsLabel}
						className="w-(--radix-popover-trigger-width) min-w-64 p-0"
						align="start"
						sideOffset={4}
						collisionPadding={8}
						avoidCollisions
					>
						<div className="flex max-h-[min(60vh,24rem)] flex-col">
							<div className="flex-1 overflow-y-auto p-1">
								{options.length === 0 ? (
									emptyState
								) : (
									<>
										{selectAllRow}
										<div className="flex flex-col gap-0.5 pt-1">
											{options.map((option) => renderOptionRow(option, "min-h-10"))}
										</div>
									</>
								)}
							</div>
							{selectedValues.length > 0 && (
								<div className="flex shrink-0 gap-1 border-t p-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleClear}
										className="flex-1"
									>
										{L.clearAll}
									</Button>
									<Separator orientation="vertical" className="h-auto" />
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											haptic("selection");
											setIsOpen(false);
										}}
										className="flex-1"
									>
										{L.close}
									</Button>
								</div>
							)}
						</div>
					</PopoverContent>
				</Popover>
			</>
		);
	},
);

MultiSelect.displayName = "MultiSelect";
