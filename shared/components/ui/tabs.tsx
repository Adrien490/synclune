"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/shared/utils/cn";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"bg-muted text-muted-foreground flex h-auto w-fit max-w-full snap-x snap-mandatory scrollbar-none items-center justify-start gap-1 overflow-x-auto scroll-smooth rounded-lg p-[3px] motion-reduce:scroll-auto",
				className,
			)}
			{...props}
		/>
	);
}

/** Base UI nomme cette partie `Tab` — le nom public reste `TabsTrigger`. */
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"text-foreground inline-flex min-h-11 shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 sm:min-h-9 sm:px-2 sm:py-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				// Base UI expose l'onglet actif via `data-active` (booléen présent/absent),
				// là où Radix écrivait `data-state="active"`.
				"data-active:bg-background data-active:text-foreground data-active:border-input data-active:shadow-sm",
				"focus-ring",
				className,
			)}
			{...props}
		/>
	);
}

/** Base UI nomme cette partie `Panel` — le nom public reste `TabsContent`. */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn("focus-ring flex-1", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
