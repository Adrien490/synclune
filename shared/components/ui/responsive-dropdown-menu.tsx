"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import * as React from "react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";

import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	useIsInsideDrawer,
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
	useDrawer: boolean;
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
	const isMobile = useIsMobile();
	const isInsideDrawer = useIsInsideDrawer();

	// Utiliser le drawer uniquement sur mobile ET si pas déjà dans un drawer
	const useDrawer = isMobile && !isInsideDrawer;

	const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
	const open = controlledOpen ?? internalOpen;

	const handleOpenChange = (newOpen: boolean) => {
		if (controlledOpen === undefined) {
			setInternalOpen(newOpen);
		}
		onOpenChange?.(newOpen);
	};

	const contextValue = {
		useDrawer,
		open,
		setOpen: handleOpenChange,
	};

	if (useDrawer) {
		return (
			<ResponsiveDropdownMenuContext.Provider value={contextValue}>
				<Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
					{children}
				</Drawer>
			</ResponsiveDropdownMenuContext.Provider>
		);
	}

	return (
		<ResponsiveDropdownMenuContext.Provider value={contextValue}>
			<DropdownMenu open={open} onOpenChange={handleOpenChange}>
				{children}
			</DropdownMenu>
		</ResponsiveDropdownMenuContext.Provider>
	);
}

// ============================================================================
// Trigger
// ============================================================================

function ResponsiveDropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return <DrawerTrigger {...props} />;
	}

	return <DropdownMenuTrigger {...props} />;
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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return (
			<DrawerContent className="pb-6">
				{title && (
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
					</DrawerHeader>
				)}
				<div role="menu" className="flex flex-col overflow-y-auto max-h-[60vh] px-2">
					{children}
				</div>
			</DrawerContent>
		);
	}

	return (
		<DropdownMenuContent className={className} {...props}>
			{children}
		</DropdownMenuContent>
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
	const { useDrawer, setOpen } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return (
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
					"flex items-center gap-2 px-2 py-3 text-left text-sm w-full",
					"min-h-[48px] rounded-sm",
					"transition-colors duration-150",
					"hover:bg-accent focus:bg-accent",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
					"active:bg-accent/80",
					"disabled:pointer-events-none disabled:opacity-50",
					variant === "destructive" && "text-destructive",
					variant === "destructive" && "hover:bg-destructive/10 focus:bg-destructive/10 active:bg-destructive/20",
					variant === "destructive" && "dark:hover:bg-destructive/20 dark:focus:bg-destructive/20",
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
		);
	}

	return (
		<DropdownMenuItem
			className={className}
			inset={inset}
			variant={variant}
			disabled={disabled}
			onSelect={onSelect}
		>
			{children}
		</DropdownMenuItem>
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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return (
			<button
				type="button"
				role="menuitemcheckbox"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onCheckedChange?.(!checked)}
				className={cn(
					"relative flex items-center gap-2 px-2 py-3 pl-8 text-left text-sm w-full",
					"min-h-[48px] rounded-sm",
					"transition-colors duration-150",
					"hover:bg-accent focus:bg-accent",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
					"active:bg-accent/80",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					"[&_svg:not([class*='size-'])]:size-4",
					className
				)}
			>
				<span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
					{checked && <CheckIcon className="size-4" />}
				</span>
				{children}
			</button>
		);
	}

	return (
		<DropdownMenuCheckboxItem
			className={className}
			checked={checked}
			disabled={disabled}
			onCheckedChange={onCheckedChange}
			onSelect={onSelect}
		>
			{children}
		</DropdownMenuCheckboxItem>
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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return (
			<RadioGroupContext.Provider value={{ value, onValueChange }}>
				<div role="group">{children}</div>
			</RadioGroupContext.Provider>
		);
	}

	return (
		<RadioGroupContext.Provider value={{ value, onValueChange }}>
			<DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
				{children}
			</DropdownMenuRadioGroup>
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
	const { useDrawer, setOpen } = useResponsiveDropdownMenuContext();
	const radioGroup = React.useContext(RadioGroupContext);
	const isSelected = radioGroup?.value === itemValue;

	if (useDrawer) {
		return (
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
					"relative flex items-center gap-2 px-2 py-3 pl-8 text-left text-sm w-full",
					"min-h-[48px] rounded-sm",
					"transition-colors duration-150",
					"hover:bg-accent focus:bg-accent",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
					"active:bg-accent/80",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					"[&_svg:not([class*='size-'])]:size-4",
					className
				)}
			>
				<span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
					{isSelected && <CircleIcon className="size-2 fill-current" />}
				</span>
				{children}
			</button>
		);
	}

	return (
		<DropdownMenuRadioItem
			className={className}
			value={itemValue}
			disabled={disabled}
		>
			{children}
		</DropdownMenuRadioItem>
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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return (
			<div
				className={cn(
					"px-2 py-1.5 text-sm font-medium",
					inset && "pl-8",
					className
				)}
			>
				{children}
			</div>
		);
	}

	return (
		<DropdownMenuLabel className={className} inset={inset}>
			{children}
		</DropdownMenuLabel>
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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return <div className={cn("h-px bg-border my-1", className)} />;
	}

	return <DropdownMenuSeparator className={className} />;
}

// ============================================================================
// Group
// ============================================================================

function ResponsiveDropdownMenuGroup({
	children,
}: {
	children?: React.ReactNode;
}) {
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return <div role="group">{children}</div>;
	}

	return <DropdownMenuGroup>{children}</DropdownMenuGroup>;
}

// ============================================================================
// Sub (Desktop only)
// ============================================================================

function ResponsiveDropdownMenuSub({
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuSub>) {
	const { useDrawer } = useResponsiveDropdownMenuContext();

	// Les sous-menus ne fonctionnent pas bien sur mobile
	if (useDrawer) {
		return null;
	}

	return <DropdownMenuSub {...props}>{children}</DropdownMenuSub>;
}

function ResponsiveDropdownMenuSubTrigger({
	children,
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger>) {
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return null;
	}

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
	const { useDrawer } = useResponsiveDropdownMenuContext();

	if (useDrawer) {
		return null;
	}

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
