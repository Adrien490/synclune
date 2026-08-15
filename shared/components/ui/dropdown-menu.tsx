"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type * as React from "react";

import { cn } from "@/shared/utils/cn";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
	return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
	return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
	className,
	sideOffset = 4,
	align = "end",
	alignOffset = 0,
	side = "bottom",
	...props
}: MenuPrimitive.Popup.Props &
	Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className="isolate z-(--z-float) outline-none"
			>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-content"
					className={cn(
						// Base styles
						"bg-popover text-popover-foreground",
						"min-w-[8rem] overflow-x-hidden overflow-y-auto",
						// Variables exposées par le Positioner de Base UI (elles héritent
						// jusqu'ici) — équivalents des `--radix-dropdown-menu-content-*`.
						"max-h-(--available-height)",
						"origin-(--transform-origin)",
						"rounded-md border p-1 shadow-md",
						// Animations (gated motion-safe — respecte prefers-reduced-motion)
						"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
						"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
						"motion-safe:data-closed:zoom-out-95 motion-safe:data-open:zoom-in-95",
						"motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=left]:slide-in-from-right-2",
						"motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2",
						// cf. `ui/popover.tsx` — `animate-out` exige un fill mode.
						"fill-mode-forwards",
						className,
					)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	);
}

/**
 * Item de menu, avec variante destructive.
 *
 * ⚠️ L'état survolé/parcouru au clavier s'exprime par **`data-highlighted`**, pas
 * par `:focus`. Base UI garde le focus DOM sur le popup et désigne l'item actif
 * par `aria-activedescendant` (focus virtuel) — un `focus:bg-accent` hérité de
 * Radix ne se déclencherait jamais. Verrouillé par
 * `dropdown-menu-highlight.regression.test.tsx`.
 *
 * @param inset - Adds left padding for alignment with checkbox/radio items
 * @param variant - Visual style variant ("default" | "destructive")
 */
function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: MenuPrimitive.Item.Props & {
	inset?: boolean;
	variant?: "default" | "destructive";
}) {
	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				// Highlight states (clavier + survol)
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
				// Destructive variant
				"data-[variant=destructive]:text-destructive",
				"data-[variant=destructive]:data-highlighted:bg-destructive/10",
				"data-[variant=destructive]:data-highlighted:text-destructive",
				"data-[variant=destructive]:*:[svg]:!text-destructive",
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
			{...props}
		/>
	);
}

/*
 * Les variantes radio (`DropdownMenuRadioGroup` / `DropdownMenuRadioItem`) ont
 * été retirées le 2026-08-06 avec leur unique consommateur (`ProductSortMenu`,
 * tri du catalogue déplacé dans le compartiment « Trier par » du meuble de
 * filtres). À re-vendorer depuis shadcn si un menu à sélection exclusive
 * revient — en gardant `data-highlighted:` (jamais `focus:`) et le
 * `closeOnClick` explicite (false par défaut chez Base UI pour un item radio).
 */

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
	return (
		<MenuPrimitive.Separator
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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
};
