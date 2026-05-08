"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
	className,
	sideOffset = 4,
	align = "end",
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				align={align}
				className={cn(
					// Base styles
					"bg-popover text-popover-foreground",
					"z-50 min-w-[8rem] overflow-x-hidden overflow-y-auto",
					"max-h-(--radix-dropdown-menu-content-available-height)",
					"origin-(--radix-dropdown-menu-content-transform-origin)",
					"rounded-md border p-1 shadow-md",
					// Animations
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
					"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

/**
 * Menu item component with support for destructive variant.
 *
 * @param inset - Adds left padding for alignment with checkbox/radio items
 * @param variant - Visual style variant ("default" | "destructive")
 * @param preventDefault - Prevents automatic menu close on selection.
 *                         Useful when wrapping interactive components like dialogs.
 */
function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	preventDefault = false,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
	inset?: boolean;
	variant?: "default" | "destructive";
	preventDefault?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				// Focus states
				"focus:bg-accent focus:text-accent-foreground",
				// Destructive variant
				"data-[variant=destructive]:text-destructive",
				"data-[variant=destructive]:focus:bg-destructive/10",
				"data-[variant=destructive]:focus:text-destructive",
				"data-[variant=destructive]:*:[svg]:!text-destructive",
				"=destructive]:text-destructive",
				"=destructive]:focus:bg-destructive/20",
				// SVG styling
				"[&_svg:not([class*='text-'])]:text-muted-foreground",
				"[&_svg]:pointer-events-none [&_svg]:shrink-0",
				"[&_svg:not([class*='size-'])]:size-4",
				// Layout
				"relative flex cursor-default items-center gap-2",
				"rounded-sm px-2 py-1.5 text-sm",
				"outline-hidden select-none",
				// Disabled & inset
				"data-disabled:pointer-events-none data-disabled:opacity-50",
				"data-inset:pl-8",
				className,
			)}
			onSelect={(e) => {
				if (preventDefault) {
					e.preventDefault();
				}
				props.onSelect?.(e);
			}}
			{...props}
		/>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.Label
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
	return (
		<DropdownMenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn("bg-border -mx-1 my-1 h-px", className)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
};
