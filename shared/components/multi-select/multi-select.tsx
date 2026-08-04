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
	/** Plafond de badges affichés sur le trigger ; au-delà, un badge « +N » résume le reste. */
	maxVisibleBadges?: number;
	/** Affiche une ligne « Tout sélectionner / Tout désélectionner » en tête de liste. */
	showSelectAll?: boolean;
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
	maxVisibleBadges,
	showSelectAll = false,
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
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const isMobile = useIsMobile();
	const triggerHaptic = useHaptic();
	const listboxId = React.useId();
	const searchId = React.useId();
	const listRef = React.useRef<HTMLUListElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);
	const typeahead = React.useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
		buffer: "",
		timer: null,
	});

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
		setAnnouncement(
			`${labelOf(val)} ${verb}. ${count} option${sCount} sélectionnée${sCount} sur ${total}.`,
		);
	};

	const clear = () => {
		if (disabled || selected.length === 0) return;
		fireHaptic("medium");
		onValueChange([]);
		setAnnouncement("Sélection vidée. Aucune option sélectionnée.");
	};

	const handleOpenChange = (open: boolean) => {
		if (disabled) return;
		setIsOpen(open);
		setActiveIndex(-1);
		if (!open) setSearch("");
	};

	const showSearch = options.length > searchThreshold;
	const normalizedSearch = search.trim().toLowerCase();
	const filteredOptions =
		showSearch && normalizedSearch
			? options.filter((o) => o.label.toLowerCase().includes(normalizedSearch))
			: options;

	// --- Sélection globale (opt-in) -------------------------------------------
	const activableValues = options.filter((o) => !o.disabled).map((o) => o.value);
	// `Set` de la sélection : `every(... selected.includes(v))` était O(options × selected).
	const selectedSet = new Set(selected);
	const allSelected =
		activableValues.length > 0 && activableValues.every((v) => selectedSet.has(v));

	const handleSelectAll = () => {
		if (disabled) return;
		fireHaptic("medium");
		if (allSelected) {
			const activableSet = new Set(activableValues);
			onValueChange(selected.filter((v) => !activableSet.has(v)));
			setAnnouncement("Toutes les options désélectionnées.");
		} else {
			onValueChange(Array.from(new Set([...selected, ...activableValues])));
			setAnnouncement(`${activableValues.length} options sélectionnées.`);
		}
	};

	// --- Navigation clavier (pattern WAI-ARIA listbox + aria-activedescendant) -
	const firstActivable = () => filteredOptions.findIndex((o) => !o.disabled);
	const lastActivable = () => {
		for (let i = filteredOptions.length - 1; i >= 0; i--) {
			if (!filteredOptions[i]!.disabled) return i;
		}
		return -1;
	};
	const nextActivable = (from: number) => {
		for (let i = from + 1; i < filteredOptions.length; i++) {
			if (!filteredOptions[i]!.disabled) return i;
		}
		return from;
	};
	const prevActivable = (from: number) => {
		for (let i = from - 1; i >= 0; i--) {
			if (!filteredOptions[i]!.disabled) return i;
		}
		return from;
	};

	const runTypeahead = (char: string) => {
		if (typeahead.current.timer) clearTimeout(typeahead.current.timer);
		typeahead.current.buffer += char.toLowerCase();
		const buf = typeahead.current.buffer;
		const idx = filteredOptions.findIndex(
			(o) => !o.disabled && o.label.toLowerCase().startsWith(buf),
		);
		if (idx >= 0) setActiveIndex(idx);
		typeahead.current.timer = setTimeout(() => {
			typeahead.current.buffer = "";
		}, 600);
	};

	// fromInput=true : focus dans le champ recherche → Home/End/typeahead réservés
	// à l'édition de texte ; seules les flèches + Enter pilotent la liste.
	const handleNav = (e: React.KeyboardEvent, fromInput: boolean) => {
		if (disabled) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((cur) => (cur < 0 ? firstActivable() : nextActivable(cur)));
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((cur) => (cur < 0 ? lastActivable() : prevActivable(cur)));
				break;
			case "Home":
				if (!fromInput) {
					e.preventDefault();
					setActiveIndex(firstActivable());
				}
				break;
			case "End":
				if (!fromInput) {
					e.preventDefault();
					setActiveIndex(lastActivable());
				}
				break;
			case "Enter":
				if (activeIndex >= 0 && filteredOptions[activeIndex]) {
					e.preventDefault();
					toggle(filteredOptions[activeIndex]!.value);
				}
				break;
			case " ":
				if (!fromInput && activeIndex >= 0 && filteredOptions[activeIndex]) {
					e.preventDefault();
					toggle(filteredOptions[activeIndex]!.value);
				}
				break;
			default:
				if (!fromInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
					runTypeahead(e.key);
				}
		}
	};

	const activeDescendant = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

	// Focus initial : champ recherche piloté par Radix (1er focusable) ; sinon on
	// donne le focus au listbox roving. Sur mobile (drawer) on n'auto-focus pas
	// pour éviter d'ouvrir le clavier dès l'ouverture.
	React.useEffect(() => {
		if (!isOpen || isMobile || showSearch) return;
		listRef.current?.focus();
	}, [isOpen, isMobile, showSearch]);

	// Garde l'option active visible.
	React.useEffect(() => {
		if (activeIndex < 0) return;
		const el = document.getElementById(`${listboxId}-opt-${activeIndex}`);
		if (el && typeof el.scrollIntoView === "function") {
			el.scrollIntoView({ block: "nearest" });
		}
	}, [activeIndex, listboxId]);

	// Plafond de badges sur le trigger : au-delà, on résume le surplus par « +N ».
	const visibleSelected =
		maxVisibleBadges != null && selected.length > maxVisibleBadges
			? selected.slice(0, maxVisibleBadges)
			: selected;
	const hiddenBadgeCount = selected.length - visibleSelected.length;

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
				"focus-ring",
				disabled && "cursor-not-allowed opacity-50",
				ariaInvalid && "border-destructive ring-destructive/20",
				className,
			)}
			{...rest}
		>
			{selected.length === 0 ? (
				<>
					<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
					<ChevronDown
						className={cn(
							"text-muted-foreground mx-2 size-4 motion-safe:transition-transform",
							isOpen && "rotate-180",
						)}
						aria-hidden="true"
					/>
				</>
			) : (
				<>
					<div className="flex flex-1 flex-wrap items-center gap-1">
						{visibleSelected.map((val) => (
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
						{hiddenBadgeCount > 0 && (
							<Badge
								aria-hidden="true"
								className="bg-muted text-muted-foreground border-foreground/10 m-0.5"
							>
								+{hiddenBadgeCount}
							</Badge>
						)}
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
							aria-label="Tout effacer"
							className="text-muted-foreground can-hover:hover:text-foreground focus-ring mx-1 flex size-8 cursor-pointer items-center justify-center rounded-sm disabled:cursor-not-allowed"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
						<Separator orientation="vertical" className="h-6" />
						<ChevronDown
							className={cn(
								"text-muted-foreground mx-2 size-4 motion-safe:transition-transform",
								isOpen && "rotate-180",
							)}
							aria-hidden="true"
						/>
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
				ref={searchRef}
				id={searchId}
				type="search"
				value={search}
				onChange={(e) => {
					setSearch(e.target.value);
					setActiveIndex(-1);
				}}
				onKeyDown={(e) => handleNav(e, true)}
				placeholder={searchPlaceholder}
				aria-label="Rechercher dans les options"
				aria-controls={listboxId}
				aria-activedescendant={activeDescendant}
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck={false}
				className="border-input focus-ring flex h-10 w-full rounded-xl border bg-transparent pr-9 pl-9 text-sm shadow-xs"
			/>
			{search.length > 0 && (
				<button
					type="button"
					onClick={() => {
						setSearch("");
						setActiveIndex(-1);
						searchRef.current?.focus();
					}}
					aria-label="Effacer la recherche"
					className="text-muted-foreground can-hover:hover:text-foreground focus-ring absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm"
				>
					<X className="size-4" aria-hidden="true" />
				</button>
			)}
		</div>
	) : null;

	const selectAllRow =
		showSelectAll && options.length > 0 ? (
			<button
				type="button"
				tabIndex={-1}
				onClick={handleSelectAll}
				aria-pressed={allSelected}
				className="hover:bg-accent flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium"
			>
				<Checkbox
					checked={allSelected}
					tabIndex={-1}
					aria-hidden="true"
					className="pointer-events-none"
				/>
				<span>{allSelected ? "Tout désélectionner" : "Tout sélectionner"}</span>
			</button>
		) : null;

	const optionsList = (
		<ul
			ref={listRef}
			id={listboxId}
			// eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- ARIA listbox pattern: <ul role="listbox"> est l'idiome WAI-ARIA pour un multiselect.
			role="listbox"
			aria-multiselectable="true"
			aria-label="Options disponibles"
			tabIndex={showSearch ? -1 : 0}
			aria-activedescendant={showSearch ? undefined : activeDescendant}
			onKeyDown={showSearch ? undefined : (e) => handleNav(e, false)}
			className="flex flex-col gap-0.5 outline-none"
		>
			{filteredOptions.length === 0 ? (
				<li role="presentation" className="text-muted-foreground py-6 text-center text-sm">
					{showSearch && normalizedSearch ? `Aucun résultat pour « ${search.trim()} »` : emptyText}
				</li>
			) : (
				filteredOptions.map((option, index) => {
					const isSelected = selectedSet.has(option.value);
					const isOptDisabled = !!option.disabled;
					/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-to-interactive-role -- pattern aria-activedescendant : le clavier est géré au niveau du listbox (onKeyDown sur input/ul) ; les <li role="option"> ne portent que le clic souris. */
					return (
						<li
							key={option.value}
							id={`${listboxId}-opt-${index}`}
							role="option"
							aria-selected={isSelected}
							aria-disabled={isOptDisabled || undefined}
							data-active={index === activeIndex || undefined}
							onClick={() => toggle(option.value)}
							onPointerEnter={() => {
								if (!isOptDisabled) setActiveIndex(index);
							}}
							className={cn(
								"hover:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm",
								"data-[active=true]:bg-accent",
								isSelected && "bg-accent/60",
								isOptDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
							)}
						>
							<Checkbox
								checked={isSelected}
								disabled={isOptDisabled || disabled}
								tabIndex={-1}
								aria-hidden="true"
								className="pointer-events-none"
							/>
							{option.prefix}
							<span className="flex-1 truncate">{option.label}</span>
							{isSelected && <Check className="text-primary size-4 shrink-0" aria-hidden="true" />}
						</li>
					);
					/* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-to-interactive-role */
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
					<DrawerTrigger render={trigger} />
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
							<div className="pb-2" data-base-ui-swipe-ignore="">
								{searchInput}
							</div>
						)}
						<DrawerBody
							style={{ maxHeight: `min(60vh, ${maxHeight + 80}px)` }}
							className="overscroll-contain"
							data-base-ui-swipe-ignore=""
						>
							{selectAllRow}
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
				<PopoverTrigger render={trigger} />
				<PopoverContent className="w-(--anchor-width) min-w-64 p-1" align="start" sideOffset={4}>
					{showSearch && <div className="px-1 pt-1 pb-2">{searchInput}</div>}
					{selectAllRow}
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
