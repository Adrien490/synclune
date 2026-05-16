"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

export interface MultiSelectOption {
	value: string;
	label: string;
	disabled?: boolean;
	/** Élément visuel optionnel rendu avant le label (ex: pastille couleur, icône). */
	prefix?: React.ReactNode;
}

export interface MultiSelectProps extends Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> {
	options: MultiSelectOption[];
	value: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	searchThreshold?: number;
	maxHeight?: number;
	haptic?: HapticPattern | false;
	emptyText?: string;
	id?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean;
	"aria-required"?: boolean;
}

export const MultiSelect = ({
	options,
	value,
	onValueChange,
	placeholder = "Sélectionner",
	disabled = false,
	searchPlaceholder = "Rechercher…",
	searchThreshold = 8,
	maxHeight = 320,
	haptic = "selection",
	emptyText = "Aucune option disponible",
	className,
	id,
	"aria-describedby": ariaDescribedBy,
	"aria-invalid": ariaInvalid,
	"aria-required": ariaRequired,
	...rest
}: MultiSelectProps) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [announcement, setAnnouncement] = React.useState("");
	const isMobile = useIsMobile();
	const triggerHaptic = useHaptic();
	const listboxId = React.useId();
	const searchId = React.useId();

	const selected = value;

	const togglePattern: HapticPattern = haptic === false ? "selection" : haptic;

	const fireHaptic = (pattern: HapticPattern) => {
		if (haptic === false) return;
		triggerHaptic(pattern);
	};

	const labelOf = (val: string) => options.find((o) => o.value === val)?.label ?? val;

	const toggle = (val: string) => {
		if (disabled) return;
		const opt = options.find((o) => o.value === val);
		if (opt?.disabled) return;
		fireHaptic(togglePattern);
		const wasSelected = selected.includes(val);
		const next = wasSelected ? selected.filter((v) => v !== val) : [...selected, val];
		onValueChange(next);
		const total = options.length;
		const count = next.length;
		const verb = wasSelected ? "désélectionné" : "sélectionné";
		const sCount = count > 1 ? "s" : "";
		const sTotal = total > 1 ? "s" : "";
		setAnnouncement(
			`${labelOf(val)} ${verb}. ${count} sur ${total} option${sTotal} sélectionnée${sCount}.`,
		);
	};

	const clear = () => {
		if (disabled || selected.length === 0) return;
		fireHaptic("medium");
		onValueChange([]);
		setAnnouncement("Sélection vidée. Aucune option sélectionnée.");
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) setSearch("");
	};

	const showSearch = options.length > searchThreshold;
	const normalizedSearch = search.trim().toLowerCase();
	const filteredOptions =
		showSearch && normalizedSearch
			? options.filter((o) => o.label.toLowerCase().includes(normalizedSearch))
			: options;

	const trigger = (
		<div
			role="combobox"
			tabIndex={disabled ? -1 : 0}
			id={id}
			aria-expanded={isOpen}
			aria-haspopup="listbox"
			aria-controls={listboxId}
			aria-disabled={disabled || undefined}
			aria-describedby={ariaDescribedBy}
			aria-invalid={ariaInvalid}
			aria-required={ariaRequired}
			onKeyDown={(e) => {
				if (disabled) return;
				if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
					e.preventDefault();
					setIsOpen(true);
				}
			}}
			className={cn(
				"flex h-auto min-h-11 w-full cursor-pointer items-center justify-between rounded-md border bg-inherit p-1",
				"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
				disabled && "cursor-not-allowed opacity-50",
				ariaInvalid && "border-destructive ring-destructive/20",
				className,
			)}
			{...rest}
		>
			{selected.length === 0 ? (
				<>
					<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
					<ChevronDown className="text-muted-foreground mx-2 size-4" aria-hidden="true" />
				</>
			) : (
				<>
					<div className="flex flex-1 flex-wrap items-center gap-1">
						{selected.map((val) => (
							<Badge key={val} className="bg-card text-foreground border-foreground/10 m-0.5">
								<span className="max-w-[12rem] truncate sm:max-w-[16rem]">{labelOf(val)}</span>
								<button
									type="button"
									tabIndex={disabled ? -1 : 0}
									disabled={disabled}
									onClick={(e) => {
										e.stopPropagation();
										toggle(val);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											e.stopPropagation();
											toggle(val);
										}
									}}
									aria-label={`Retirer ${labelOf(val)}`}
									className="hover:bg-foreground/20 focus-visible:ring-foreground/50 -mr-1 ml-1 flex size-6 cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed"
								>
									<X className="size-3" aria-hidden="true" />
								</button>
							</Badge>
						))}
					</div>
					<div className="flex shrink-0 items-center">
						<button
							type="button"
							tabIndex={disabled ? -1 : 0}
							disabled={disabled}
							onClick={(e) => {
								e.stopPropagation();
								clear();
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									clear();
								}
							}}
							aria-label={`Effacer les ${selected.length} options sélectionnées`}
							className="text-muted-foreground hover:text-foreground focus:ring-ring mx-1 flex size-8 cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
						<Separator orientation="vertical" className="h-6" />
						<ChevronDown className="text-muted-foreground mx-2 size-4" aria-hidden="true" />
					</div>
				</>
			)}
		</div>
	);

	const searchInput = showSearch ? (
		<div className="relative">
			<Search
				className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
				aria-hidden="true"
			/>
			<input
				id={searchId}
				type="search"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder={searchPlaceholder}
				aria-label="Rechercher dans les options"
				aria-controls={listboxId}
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck={false}
				className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border bg-transparent pr-3 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
			/>
		</div>
	) : null;

	const optionsList = (
		<ul
			id={listboxId}
			// eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- ARIA listbox pattern: <ul role="listbox"> + <li role="presentation"> > <label> avec Checkbox est l'idiome WAI-ARIA pour un multiselect listbox.
			role="listbox"
			aria-multiselectable="true"
			aria-label="Options disponibles"
			className="flex flex-col gap-0.5"
		>
			{filteredOptions.length === 0 ? (
				<li role="presentation" className="text-muted-foreground py-6 text-center text-sm">
					{showSearch && normalizedSearch ? `Aucun résultat pour « ${search.trim()} »` : emptyText}
				</li>
			) : (
				filteredOptions.map((option) => {
					const isSelected = selected.includes(option.value);
					const isOptDisabled = !!option.disabled;
					return (
						<li key={option.value} role="presentation">
							<label
								aria-disabled={isOptDisabled || undefined}
								data-state={isSelected ? "checked" : "unchecked"}
								className={cn(
									"hover:bg-accent focus-within:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3",
									"data-[state=checked]:bg-accent/60",
									isOptDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
								)}
							>
								<Checkbox
									checked={isSelected}
									disabled={isOptDisabled || disabled}
									onCheckedChange={() => toggle(option.value)}
									className="pointer-events-none"
								/>
								{option.prefix}
								<span className="flex-1 truncate text-sm">{option.label}</span>
								{isSelected && (
									<Check className="text-primary size-4 shrink-0" aria-hidden="true" />
								)}
							</label>
						</li>
					);
				})
			)}
		</ul>
	);

	const ariaLiveRegion = (
		<div aria-live="polite" aria-atomic="true" className="sr-only">
			{announcement}
		</div>
	);

	if (isMobile) {
		return (
			<>
				{ariaLiveRegion}
				<Drawer open={isOpen} onOpenChange={handleOpenChange} repositionInputs={showSearch}>
					<DrawerTrigger asChild>{trigger}</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>{placeholder}</DrawerTitle>
							<DrawerDescription className="sr-only">
								{options.length === 0
									? emptyText
									: `${options.length} option${options.length > 1 ? "s" : ""} disponible${options.length > 1 ? "s" : ""}`}
							</DrawerDescription>
						</DrawerHeader>
						{showSearch && (
							<div className="pb-2" data-vaul-no-drag>
								{searchInput}
							</div>
						)}
						<DrawerBody
							style={{ maxHeight: `min(60vh, ${maxHeight + 80}px)` }}
							className="overscroll-contain"
							data-vaul-no-drag
						>
							{optionsList}
						</DrawerBody>
					</DrawerContent>
				</Drawer>
			</>
		);
	}

	return (
		<>
			{ariaLiveRegion}
			<Popover open={isOpen} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>{trigger}</PopoverTrigger>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) min-w-64 p-1"
					align="start"
					sideOffset={4}
				>
					{showSearch && <div className="px-1 pt-1 pb-2">{searchInput}</div>}
					<div
						style={{ maxHeight: `${maxHeight}px` }}
						className="overflow-y-auto overscroll-contain"
					>
						{optionsList}
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
};
