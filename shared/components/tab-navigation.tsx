"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
	/** Nombre d'items visibles sur mobile avant le bouton "Plus" (défaut: 3) */
	mobileVisibleCount?: number;
}

/**
 * Composant de navigation par onglets avec pattern Priority+
 *
 * - Desktop : tous les onglets visibles
 * - Mobile : N premiers onglets + dropdown "Plus" pour le reste
 */
export function TabNavigation({
	items,
	activeValue,
	ariaLabel = "Navigation par onglets",
	prefetch = false,
	mobileVisibleCount = 3,
}: TabNavigationProps) {
	// Séparer les items visibles et ceux dans le dropdown
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
			"inline-flex h-11 sm:h-9 items-center justify-center gap-1.5",
			"rounded-md px-3 py-1.5",
			"text-sm font-medium whitespace-nowrap",
			"transition-all duration-200",
			"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2",
			isActive && [
				"bg-background text-foreground",
				"shadow-sm border border-border",
				"font-semibold",
			],
			!isActive && [
				"text-muted-foreground border border-transparent",
				"hover:bg-background/60 hover:text-foreground",
				"hover:border-border/50 hover:shadow-sm",
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
						? "bg-primary/10 text-primary"
						: "bg-muted-foreground/20 text-foreground/70"
				)}
			>
				{count}
			</span>
		);
	};

	return (
		<nav aria-label={ariaLabel} className="w-full">
			<div className="bg-muted rounded-lg p-1 flex flex-wrap gap-1 sm:gap-1.5">
				{/* Items toujours visibles (mobile + desktop) */}
				{visibleItems.map((item) => (
					<Link
						key={item.value}
						href={item.href}
						prefetch={prefetch}
						className={getTabClasses(item.value)}
						aria-current={activeValue === item.value ? "page" : undefined}
					>
						{item.label}
						{renderCount(item.count, activeValue === item.value)}
					</Link>
				))}

				{/* Items overflow - visibles uniquement sur desktop (>=640px) */}
				{overflowItems.map((item) => (
					<Link
						key={item.value}
						href={item.href}
						prefetch={prefetch}
						className={getTabClasses(item.value, "hidden sm:inline-flex")}
						aria-current={activeValue === item.value ? "page" : undefined}
					>
						{item.label}
						{renderCount(item.count, activeValue === item.value)}
					</Link>
				))}

				{/* Bouton "Plus" avec dropdown - visible uniquement sur mobile (<640px) */}
				{hasOverflow && (
					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								"sm:hidden inline-flex h-11 items-center justify-center gap-1.5",
								"rounded-md px-3 py-1.5",
								"text-sm font-medium whitespace-nowrap",
								"transition-all duration-200",
								"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2",
								activeOverflowItem
									? [
											"bg-background text-foreground",
											"shadow-sm border border-border",
											"font-semibold",
										]
									: [
											"text-muted-foreground border border-transparent",
											"hover:bg-background/60 hover:text-foreground",
											"hover:border-border/50 hover:shadow-sm",
										]
							)}
							aria-label="Plus d'options de navigation"
						>
							{activeOverflowItem?.label || "Plus"}
							<ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="min-w-[180px]">
							{overflowItems.map((item) => (
								<DropdownMenuItem key={item.value} asChild>
									<Link
										href={item.href}
										prefetch={prefetch}
										className={cn(
											"w-full cursor-pointer",
											item.value === activeValue && "font-medium bg-accent"
										)}
										aria-current={
											item.value === activeValue ? "page" : undefined
										}
									>
										{item.label}
										{item.count !== undefined && (
											<span className="ml-auto text-xs text-muted-foreground">
												{item.count}
											</span>
										)}
									</Link>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</nav>
	);
}
