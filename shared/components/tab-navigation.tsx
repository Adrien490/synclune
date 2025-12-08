"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/utils/cn";

export interface TabNavigationItem {
	label: string;
	value: string;
	href: string;
	/** Nombre d'éléments (optionnel) */
	count?: number;
}

interface TabNavigationProps {
	items: TabNavigationItem[];
	activeValue?: string;
	ariaLabel?: string;
	/** Activer le prefetch des liens (défaut: false) */
	prefetch?: boolean;
	/** Nombre d'items visibles sur mobile avant le bouton "Plus" (défaut: 2) */
	mobileVisibleCount?: number;
}

/** Classes de base partagées pour les onglets */
const TAB_BASE_CLASSES =
	"inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2";

/**
 * Composant de navigation par onglets avec pattern Priority+
 *
 * - Desktop (>=768px) : tous les onglets visibles en ligne
 * - Mobile (<768px) : N premiers onglets + drawer "Plus" pour le reste
 */
export function TabNavigation({
	items,
	activeValue,
	ariaLabel = "Navigation principale",
	prefetch = false,
	mobileVisibleCount = 2,
}: TabNavigationProps) {
	// Séparer les items visibles et ceux dans le drawer mobile
	const visibleItems = items.slice(0, mobileVisibleCount);
	const overflowItems = items.slice(mobileVisibleCount);
	const hasOverflow = overflowItems.length > 0;

	// Trouver l'item actif s'il est dans l'overflow
	const activeOverflowItem = overflowItems.find(
		(item) => item.value === activeValue
	);

	const getTabClasses = (value: string, additionalClasses?: string) => {
		const isActive = value === activeValue;

		return cn(
			TAB_BASE_CLASSES,
			"h-11 md:h-10 md:flex-shrink-0",
			isActive && [
				"bg-primary/10 text-foreground",
				"shadow-sm border border-primary/25",
				"font-semibold",
			],
			!isActive && [
				"text-muted-foreground border border-transparent",
				"hover:bg-primary/5 hover:text-foreground",
				"hover:border-primary/15",
			],
			additionalClasses
		);
	};

	const renderCount = (count: number | undefined, isActive: boolean) => {
		if (count === undefined) return null;

		return (
			<span
				title={`${count} élément${count > 1 ? "s" : ""}`}
				className={cn(
					"ml-1.5 inline-flex items-center justify-center",
					"min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs",
					isActive
						? "bg-primary/15 text-foreground font-medium"
						: "bg-muted-foreground/15 text-muted-foreground"
				)}
			>
				{count}
			</span>
		);
	};

	const triggerClasses = cn(
		TAB_BASE_CLASSES,
		"md:hidden h-11 max-w-[min(140px,40vw)]",
		activeOverflowItem
			? [
					"bg-primary/10 text-foreground",
					"shadow-sm border border-primary/25",
					"font-semibold",
				]
			: [
					"text-muted-foreground border border-transparent",
					"hover:bg-primary/5 hover:text-foreground",
					"hover:border-primary/15",
				]
	);

	const renderOverflowMenu = () => {
		if (!hasOverflow) return null;

		return (
			<Drawer>
				<DrawerTrigger
					className={triggerClasses}
					aria-label="Plus d'options de navigation"
				>
					<span className="truncate">{activeOverflowItem?.label || "Plus"}</span>
					<ChevronDownIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
				</DrawerTrigger>
				<DrawerContent className="data-[vaul-drawer-direction=bottom]:bottom-0 pb-6">
					<DrawerHeader>
						<DrawerTitle>Navigation</DrawerTitle>
					</DrawerHeader>
					<nav
						aria-label="Options de navigation supplémentaires"
						className="flex flex-col overflow-y-auto max-h-[60vh] px-2"
					>
						{overflowItems.map((item) => (
							<DrawerClose key={item.value} asChild>
								<Link
									href={item.href}
									prefetch={prefetch}
									aria-current={
										activeValue === item.value ? "page" : undefined
									}
									className={cn(
										"flex items-center gap-2 px-3 py-3 text-left text-sm w-full",
										"min-h-[48px] rounded-lg",
										"transition-all duration-200",
										"hover:bg-primary/5 focus:bg-primary/5",
										"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
										"active:bg-primary/10",
										item.value === activeValue && "font-medium bg-primary/10"
									)}
								>
									{item.label}
									{item.count !== undefined && (
										<span className="ml-auto text-xs text-muted-foreground">
											{item.count}
										</span>
									)}
								</Link>
							</DrawerClose>
						))}
					</nav>
				</DrawerContent>
			</Drawer>
		);
	};

	return (
		<nav aria-label={ariaLabel} className="w-full">
			<div className="rounded-xl bg-muted/40 p-1.5 flex gap-1.5 md:gap-2 min-w-0">
				{/* Items toujours visibles (mobile + desktop) */}
				{visibleItems.map((item) => (
					<Link
						key={item.value}
						href={item.href}
						prefetch={prefetch}
						className={getTabClasses(item.value, "min-w-0")}
						aria-current={activeValue === item.value ? "page" : undefined}
					>
						<span className="truncate">{item.label}</span>
						{renderCount(item.count, activeValue === item.value)}
					</Link>
				))}

				{/* Items overflow - visibles uniquement sur desktop (>=768px) */}
				{overflowItems.map((item) => (
					<Link
						key={item.value}
						href={item.href}
						prefetch={prefetch}
						className={getTabClasses(item.value, "hidden md:inline-flex min-w-0")}
						aria-current={activeValue === item.value ? "page" : undefined}
					>
						<span className="truncate">{item.label}</span>
						{renderCount(item.count, activeValue === item.value)}
					</Link>
				))}

				{/* Bouton "Plus" avec drawer - visible uniquement sur mobile (<768px) */}
				{renderOverflowMenu()}
			</div>
		</nav>
	);
}
