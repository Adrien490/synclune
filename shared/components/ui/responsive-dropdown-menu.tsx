"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu";

// ============================================================================
// Context
// ============================================================================

interface ResponsiveDropdownMenuContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
}

const ResponsiveDropdownMenuContext =
	React.createContext<ResponsiveDropdownMenuContextValue | null>(null);

function useResponsiveDropdownMenuContext() {
	const context = React.useContext(ResponsiveDropdownMenuContext);
	if (!context) {
		throw new Error(
			"Les composants ResponsiveDropdownMenu doivent être utilisés dans un ResponsiveDropdownMenu"
		);
	}
	return context;
}

// ============================================================================
// Root Component
// ============================================================================

interface ResponsiveDropdownMenuProps {
	children: React.ReactNode;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function ResponsiveDropdownMenu({
	children,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
}: ResponsiveDropdownMenuProps) {
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
	const open = controlledOpen ?? internalOpen;

	const handleOpenChange = (newOpen: boolean) => {
		if (controlledOpen === undefined) {
			setInternalOpen(newOpen);
		}
		onOpenChange?.(newOpen);
	};

	return (
		<ResponsiveDropdownMenuContext.Provider
			value={{ open, setOpen: handleOpenChange }}
		>
			{/* Desktop: DropdownMenu */}
			<div className="hidden md:contents">
				<DropdownMenu open={open} onOpenChange={handleOpenChange}>
					{children}
				</DropdownMenu>
			</div>

			{/* Mobile: Drawer */}
			<div className="contents md:hidden">
				<Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
					{children}
				</Drawer>
			</div>
		</ResponsiveDropdownMenuContext.Provider>
	);
}

// ============================================================================
// Trigger
// ============================================================================

function ResponsiveDropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
	return (
		<>
			<div className="hidden md:contents">
				<DropdownMenuTrigger {...props} />
			</div>
			<div className="contents md:hidden">
				<DrawerTrigger {...props} />
			</div>
		</>
	);
}

// ============================================================================
// Content
// ============================================================================

interface ResponsiveDropdownMenuContentProps
	extends React.ComponentProps<typeof DropdownMenuContent> {
	/** Titre affiché dans le header du drawer mobile */
	title?: string;
}

function ResponsiveDropdownMenuContent({
	children,
	className,
	title,
	...props
}: ResponsiveDropdownMenuContentProps) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuContent className={className} {...props}>
					{children}
				</DropdownMenuContent>
			</div>

			{/* Mobile */}
			<div className="contents md:hidden">
				<DrawerContent className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
					{title && (
						<DrawerHeader>
							<DrawerTitle>{title}</DrawerTitle>
						</DrawerHeader>
					)}
					<div role="menu" className="flex flex-col overflow-y-auto max-h-[60vh]">
						{children}
					</div>
				</DrawerContent>
			</div>
		</>
	);
}

// ============================================================================
// Item
// ============================================================================

interface ResponsiveDropdownMenuItemProps {
	children?: React.ReactNode;
	className?: string;
	inset?: boolean;
	variant?: "default" | "destructive";
	disabled?: boolean;
	onSelect?: (event: Event) => void;
}

function ResponsiveDropdownMenuItem({
	children,
	className,
	inset,
	variant = "default",
	disabled,
	onSelect,
}: ResponsiveDropdownMenuItemProps) {
	const { setOpen } = useResponsiveDropdownMenuContext();

	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuItem
					className={className}
					inset={inset}
					variant={variant}
					disabled={disabled}
					onSelect={onSelect}
				>
					{children}
				</DropdownMenuItem>
			</div>

			{/* Mobile */}
			<button
				type="button"
				role="menuitem"
				disabled={disabled}
				onClick={() => {
					if (onSelect) {
						const syntheticEvent = new Event("select", { cancelable: true });
						onSelect(syntheticEvent);
						if (!syntheticEvent.defaultPrevented) {
							setOpen(false);
						}
					} else {
						setOpen(false);
					}
				}}
				className={cn(
					"flex items-center gap-3 px-4 py-3 text-left text-sm w-full md:hidden",
					"min-h-[48px]",
					"hover:bg-accent focus:bg-accent focus:outline-none",
					"disabled:pointer-events-none disabled:opacity-50",
					variant === "destructive" && "text-destructive",
					variant === "destructive" && "hover:bg-destructive/10 focus:bg-destructive/10",
					"[&_svg:not([class*='text-'])]:text-muted-foreground",
					variant === "destructive" && "[&_svg]:!text-destructive",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					"[&_svg:not([class*='size-'])]:size-4",
					inset && "pl-8",
					className
				)}
			>
				{children}
			</button>
		</>
	);
}

// ============================================================================
// CheckboxItem
// ============================================================================

interface ResponsiveDropdownMenuCheckboxItemProps {
	children?: React.ReactNode;
	className?: string;
	checked?: boolean;
	disabled?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	onSelect?: (event: Event) => void;
}

function ResponsiveDropdownMenuCheckboxItem({
	children,
	className,
	checked,
	disabled,
	onCheckedChange,
	onSelect,
}: ResponsiveDropdownMenuCheckboxItemProps) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuCheckboxItem
					className={className}
					checked={checked}
					disabled={disabled}
					onCheckedChange={onCheckedChange}
					onSelect={onSelect}
				>
					{children}
				</DropdownMenuCheckboxItem>
			</div>

			{/* Mobile */}
			<button
				type="button"
				role="menuitemcheckbox"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onCheckedChange?.(!checked)}
				className={cn(
					"relative flex items-center gap-3 px-4 py-3 pl-8 text-left text-sm w-full md:hidden",
					"min-h-[48px]",
					"hover:bg-accent focus:bg-accent focus:outline-none",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					"[&_svg:not([class*='size-'])]:size-4",
					className
				)}
			>
				<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
					{checked && <CheckIcon className="size-4" />}
				</span>
				{children}
			</button>
		</>
	);
}

// ============================================================================
// RadioGroup
// ============================================================================

const RadioGroupContext = React.createContext<{
	value?: string;
	onValueChange?: (value: string) => void;
} | null>(null);

interface ResponsiveDropdownMenuRadioGroupProps {
	children?: React.ReactNode;
	value?: string;
	onValueChange?: (value: string) => void;
}

function ResponsiveDropdownMenuRadioGroup({
	children,
	value,
	onValueChange,
}: ResponsiveDropdownMenuRadioGroupProps) {
	return (
		<RadioGroupContext.Provider value={{ value, onValueChange }}>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
					{children}
				</DropdownMenuRadioGroup>
			</div>

			{/* Mobile */}
			<div role="group" className="contents md:hidden">
				{children}
			</div>
		</RadioGroupContext.Provider>
	);
}

// ============================================================================
// RadioItem
// ============================================================================

interface ResponsiveDropdownMenuRadioItemProps {
	children?: React.ReactNode;
	className?: string;
	value: string;
	disabled?: boolean;
}

function ResponsiveDropdownMenuRadioItem({
	children,
	className,
	value: itemValue,
	disabled,
}: ResponsiveDropdownMenuRadioItemProps) {
	const { setOpen } = useResponsiveDropdownMenuContext();
	const radioGroup = React.useContext(RadioGroupContext);
	const isSelected = radioGroup?.value === itemValue;

	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuRadioItem
					className={className}
					value={itemValue}
					disabled={disabled}
				>
					{children}
				</DropdownMenuRadioItem>
			</div>

			{/* Mobile */}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={isSelected}
				disabled={disabled}
				onClick={() => {
					radioGroup?.onValueChange?.(itemValue);
					setOpen(false);
				}}
				className={cn(
					"relative flex items-center gap-3 px-4 py-3 pl-8 text-left text-sm w-full md:hidden",
					"min-h-[48px]",
					"hover:bg-accent focus:bg-accent focus:outline-none",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					"[&_svg:not([class*='size-'])]:size-4",
					className
				)}
			>
				<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
					{isSelected && <CircleIcon className="size-2 fill-current" />}
				</span>
				{children}
			</button>
		</>
	);
}

// ============================================================================
// Label
// ============================================================================

interface ResponsiveDropdownMenuLabelProps {
	children?: React.ReactNode;
	className?: string;
	inset?: boolean;
}

function ResponsiveDropdownMenuLabel({
	children,
	className,
	inset,
}: ResponsiveDropdownMenuLabelProps) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuLabel className={className} inset={inset}>
					{children}
				</DropdownMenuLabel>
			</div>

			{/* Mobile */}
			<div
				className={cn(
					"px-4 py-2 text-sm font-medium md:hidden",
					inset && "pl-8",
					className
				)}
			>
				{children}
			</div>
		</>
	);
}

// ============================================================================
// Separator
// ============================================================================

function ResponsiveDropdownMenuSeparator({
	className,
}: {
	className?: string;
}) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuSeparator className={className} />
			</div>

			{/* Mobile */}
			<div className={cn("h-px bg-border -mx-1 my-1 md:hidden", className)} />
		</>
	);
}

// ============================================================================
// Group
// ============================================================================

function ResponsiveDropdownMenuGroup({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:contents">
				<DropdownMenuGroup>{children}</DropdownMenuGroup>
			</div>

			{/* Mobile */}
			<div role="group" className="contents md:hidden">
				{children}
			</div>
		</>
	);
}

// ============================================================================
// Sub (Desktop only)
// ============================================================================

function ResponsiveDropdownMenuSub({
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuSub>) {
	return (
		<div className="hidden md:contents">
			<DropdownMenuSub {...props}>{children}</DropdownMenuSub>
		</div>
	);
}

function ResponsiveDropdownMenuSubTrigger({
	children,
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger>) {
	return (
		<DropdownMenuSubTrigger className={className} inset={inset} {...props}>
			{children}
		</DropdownMenuSubTrigger>
	);
}

function ResponsiveDropdownMenuSubContent({
	children,
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
	return (
		<DropdownMenuSubContent className={className} {...props}>
			{children}
		</DropdownMenuSubContent>
	);
}

// ============================================================================
// Exports
// ============================================================================

export {
	ResponsiveDropdownMenu,
	ResponsiveDropdownMenuCheckboxItem,
	ResponsiveDropdownMenuContent,
	ResponsiveDropdownMenuGroup,
	ResponsiveDropdownMenuItem,
	ResponsiveDropdownMenuLabel,
	ResponsiveDropdownMenuRadioGroup,
	ResponsiveDropdownMenuRadioItem,
	ResponsiveDropdownMenuSeparator,
	ResponsiveDropdownMenuSub,
	ResponsiveDropdownMenuSubContent,
	ResponsiveDropdownMenuSubTrigger,
	ResponsiveDropdownMenuTrigger,
};
