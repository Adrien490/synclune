"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useIsInsideDrawer } from "./drawer";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";
import { Check, ChevronDownIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

// ============================================================================
// Context
// ============================================================================

interface ResponsiveSelectContextValue {
	value: string;
	onValueChange: (value: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
	useDrawer: boolean;
	disabled?: boolean;
	placeholder?: string;
	title?: string;
}

const ResponsiveSelectContext =
	React.createContext<ResponsiveSelectContextValue | null>(null);

function useResponsiveSelectContext() {
	const context = React.useContext(ResponsiveSelectContext);
	if (!context) {
		throw new Error(
			"Les composants ResponsiveSelect doivent être utilisés dans un ResponsiveSelect"
		);
	}
	return context;
}

// ============================================================================
// Root Component
// ============================================================================

interface ResponsiveSelectProps {
	children: React.ReactNode;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	name?: string;
	required?: boolean;
	/** Titre affiché dans le header du drawer mobile */
	title?: string;
}

function ResponsiveSelect({
	children,
	value: controlledValue,
	defaultValue = "",
	onValueChange,
	open: controlledOpen,
	onOpenChange,
	disabled,
	name,
	required,
	title,
}: ResponsiveSelectProps) {
	const isMobile = useIsMobile();
	const isInsideDrawer = useIsInsideDrawer();

	// Utiliser le drawer uniquement sur mobile ET si pas déjà dans un drawer
	const useDrawer = isMobile && !isInsideDrawer;

	const [internalValue, setInternalValue] = React.useState(defaultValue);
	const [internalOpen, setInternalOpen] = React.useState(false);

	const value = controlledValue ?? internalValue;
	const open = controlledOpen ?? internalOpen;

	const handleValueChange = React.useCallback(
		(newValue: string) => {
			if (controlledValue === undefined) {
				setInternalValue(newValue);
			}
			onValueChange?.(newValue);
		},
		[controlledValue, onValueChange]
	);

	const handleOpenChange = React.useCallback(
		(newOpen: boolean) => {
			if (controlledOpen === undefined) {
				setInternalOpen(newOpen);
			}
			onOpenChange?.(newOpen);
		},
		[controlledOpen, onOpenChange]
	);

	const contextValue = React.useMemo(
		() => ({
			value,
			onValueChange: handleValueChange,
			open,
			setOpen: handleOpenChange,
			useDrawer,
			disabled,
			title,
		}),
		[value, handleValueChange, open, handleOpenChange, useDrawer, disabled, title]
	);

	// Mode Desktop ou nested drawer: utiliser Select Radix standard
	if (!useDrawer) {
		return (
			<ResponsiveSelectContext.Provider value={contextValue}>
				<Select
					value={value}
					onValueChange={handleValueChange}
					open={open}
					onOpenChange={handleOpenChange}
					disabled={disabled}
					name={name}
					required={required}
				>
					{children}
				</Select>
			</ResponsiveSelectContext.Provider>
		);
	}

	// Mode Mobile standalone: Drawer wrapper
	return (
		<ResponsiveSelectContext.Provider value={contextValue}>
			<Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
				{children}
			</Drawer>
			{/* Hidden input for form submission */}
			{name && <input type="hidden" name={name} value={value} />}
		</ResponsiveSelectContext.Provider>
	);
}

// ============================================================================
// Trigger
// ============================================================================

interface ResponsiveSelectTriggerProps
	extends Omit<React.ComponentProps<typeof SelectTrigger>, "onClick"> {
	children?: React.ReactNode;
}

function ResponsiveSelectTrigger({
	className,
	children,
	size = "default",
	...props
}: ResponsiveSelectTriggerProps) {
	const { useDrawer, disabled } = useResponsiveSelectContext();

	if (!useDrawer) {
		return (
			<SelectTrigger className={className} size={size} {...props}>
				{children}
			</SelectTrigger>
		);
	}

	// Mode drawer: DrawerTrigger avec style de SelectTrigger
	return (
		<DrawerTrigger asChild>
			<button
				type="button"
				disabled={disabled}
				className={cn(
					"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
					size === "default" && "h-9",
					size === "sm" && "h-8",
					className
				)}
				{...props}
			>
				{children}
				<ChevronDownIcon className="size-4 opacity-50" />
			</button>
		</DrawerTrigger>
	);
}

// ============================================================================
// Value
// ============================================================================

interface ResponsiveSelectValueProps {
	placeholder?: string;
	children?: React.ReactNode;
}

function ResponsiveSelectValue({
	placeholder,
	children,
}: ResponsiveSelectValueProps) {
	const { useDrawer, value } = useResponsiveSelectContext();

	if (!useDrawer) {
		return <SelectValue placeholder={placeholder}>{children}</SelectValue>;
	}

	// Mode drawer: afficher la valeur ou le placeholder
	if (!value) {
		return (
			<span className="text-muted-foreground pointer-events-none">
				{placeholder}
			</span>
		);
	}

	return <span className="pointer-events-none">{children ?? value}</span>;
}

// ============================================================================
// Content
// ============================================================================

interface ResponsiveSelectContentProps
	extends React.ComponentProps<typeof SelectContent> {
	children: React.ReactNode;
}

function ResponsiveSelectContent({
	children,
	className,
	...props
}: ResponsiveSelectContentProps) {
	const { useDrawer, title } = useResponsiveSelectContext();

	if (!useDrawer) {
		return (
			<SelectContent className={className} {...props}>
				{children}
			</SelectContent>
		);
	}

	// Mode drawer: juste DrawerContent (le Drawer est au niveau root)
	return (
		<DrawerContent className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
			{title && (
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
				</DrawerHeader>
			)}
			<div
				role="listbox"
				className={cn("flex flex-col overflow-y-auto max-h-[60vh]", className)}
			>
				{children}
			</div>
		</DrawerContent>
	);
}

// ============================================================================
// Item
// ============================================================================

interface ResponsiveSelectItemProps
	extends React.ComponentProps<typeof SelectItem> {
	value: string;
	children: React.ReactNode;
}

function ResponsiveSelectItem({
	value: itemValue,
	children,
	className,
	disabled,
	...props
}: ResponsiveSelectItemProps) {
	const { useDrawer, value, onValueChange, setOpen } =
		useResponsiveSelectContext();

	if (!useDrawer) {
		return (
			<SelectItem
				value={itemValue}
				className={className}
				disabled={disabled}
				{...props}
			>
				{children}
			</SelectItem>
		);
	}

	// Mode drawer: bouton avec check
	const isSelected = value === itemValue;

	return (
		<button
			type="button"
			role="option"
			aria-selected={isSelected}
			disabled={disabled}
			onClick={() => {
				onValueChange(itemValue);
				setOpen(false);
			}}
			className={cn(
				"flex items-center gap-3 px-4 py-3 text-left text-sm",
				"min-h-[48px]", // Touch target 48px
				"hover:bg-accent focus:bg-accent focus:outline-hidden",
				"disabled:pointer-events-none disabled:opacity-50",
				isSelected && "bg-accent/50",
				className
			)}
		>
			<span className="flex-1">{children}</span>
			{isSelected && <Check className="size-4 text-primary shrink-0" />}
		</button>
	);
}

// ============================================================================
// Group, Label, Separator (passthrough)
// ============================================================================

function ResponsiveSelectGroup({
	children,
	className,
	...props
}: React.ComponentProps<typeof SelectGroup>) {
	const { useDrawer } = useResponsiveSelectContext();

	if (!useDrawer) {
		return (
			<SelectGroup className={className} {...props}>
				{children}
			</SelectGroup>
		);
	}

	return <div className={cn("flex flex-col", className)}>{children}</div>;
}

function ResponsiveSelectLabel({
	children,
	className,
	...props
}: React.ComponentProps<typeof SelectLabel>) {
	const { useDrawer } = useResponsiveSelectContext();

	if (!useDrawer) {
		return (
			<SelectLabel className={className} {...props}>
				{children}
			</SelectLabel>
		);
	}

	return (
		<div
			className={cn(
				"px-4 py-2 text-xs font-medium text-muted-foreground",
				className
			)}
		>
			{children}
		</div>
	);
}

function ResponsiveSelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectSeparator>) {
	const { useDrawer } = useResponsiveSelectContext();

	if (!useDrawer) {
		return <SelectSeparator className={className} {...props} />;
	}

	return <div className={cn("h-px bg-border my-1", className)} />;
}

// ============================================================================
// Exports
// ============================================================================

export {
	ResponsiveSelect,
	ResponsiveSelectContent,
	ResponsiveSelectGroup,
	ResponsiveSelectItem,
	ResponsiveSelectLabel,
	ResponsiveSelectSeparator,
	ResponsiveSelectTrigger,
	ResponsiveSelectValue,
};
