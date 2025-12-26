"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHandle,
	DrawerHeader,
	DrawerTitle,
	DrawerBody,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/utils/cn";

export interface TabNavigationItem {
	label: string;
	value: string;
	href: string;
}

interface TabNavigationProps {
	items: TabNavigationItem[];
	activeValue?: string;
	ariaLabel?: string;
	/** Activer le prefetch des liens (défaut: false) */
	prefetch?: boolean;
	/** Nombre d'items visibles sur mobile avant le bouton "Plus" (défaut: 2) */
	mobileVisibleCount?: number;
	/** Titre affiché dans le panel mobile */
	panelTitle?: string;
}

/** Classes de base pour les pills */
const PILL_BASE =
	"inline-flex items-center justify-center gap-1.5 h-12 md:h-11 min-w-[44px] px-4 rounded-full text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Composant de navigation par onglets
 *
 * - Desktop : tous les onglets en ligne
 * - Mobile : N premiers onglets + bouton "Plus" ouvrant un drawer
 */
export function TabNavigation({
	items,
	activeValue,
	ariaLabel = "Navigation principale",
	prefetch = false,
	mobileVisibleCount = 2,
	panelTitle,
}: TabNavigationProps) {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Early return si pas d'items
	if (items.length === 0) {
		return null;
	}

	// Séparer les items visibles et ceux dans le panel mobile
	const visibleItems = items.slice(0, mobileVisibleCount);
	const overflowItems = items.slice(mobileVisibleCount);
	const hasOverflow = overflowItems.length > 0;

	// Trouver l'item actif s'il est dans l'overflow
	const activeOverflowItem = overflowItems.find(
		(item) => item.value === activeValue
	);

	const getPillClasses = (isActive: boolean) =>
		cn(
			PILL_BASE,
			isActive
				? "bg-primary text-primary-foreground shadow-sm"
				: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm"
		);

	return (
		<nav aria-label={ariaLabel} className="w-full">
			<div className="flex flex-wrap gap-2">
				{/* Items toujours visibles (mobile + desktop) */}
				{visibleItems.map((item) => {
					const isActive = item.value === activeValue;
					return (
						<Link
							key={item.value}
							href={item.href}
							prefetch={prefetch}
							aria-current={isActive ? "page" : undefined}
							className={getPillClasses(isActive)}
						>
							<span className="truncate">{item.label}</span>
						</Link>
					);
				})}

				{/* Items overflow - visibles uniquement sur desktop */}
				{overflowItems.map((item) => {
					const isActive = item.value === activeValue;
					return (
						<Link
							key={item.value}
							href={item.href}
							prefetch={prefetch}
							aria-current={isActive ? "page" : undefined}
							className={cn(getPillClasses(isActive), "hidden md:inline-flex")}
						>
							<span className="truncate">{item.label}</span>
						</Link>
					);
				})}

				{/* Bouton "Plus" - visible uniquement sur mobile */}
				{hasOverflow && (
					<>
						<Button
							type="button"
							onClick={() => setIsDrawerOpen(true)}
							className={cn(
								PILL_BASE,
								"md:hidden max-w-36",
								activeOverflowItem
									? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
									: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
							)}
							title={activeOverflowItem?.label}
							aria-label="Plus d'options de navigation"
							aria-expanded={isDrawerOpen}
							aria-haspopup="dialog"
						>
							<span className="truncate">
								{activeOverflowItem?.label || "Plus"}
							</span>
							<ChevronDownIcon
								className={cn(
									"size-4 shrink-0 transition-transform duration-200",
									isDrawerOpen && "rotate-180"
								)}
								aria-hidden="true"
							/>
						</Button>

						<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
							<DrawerContent>
								<DrawerHandle />
								<DrawerHeader>
									<DrawerTitle>
										{panelTitle || "Parcourir par type"}
									</DrawerTitle>
								</DrawerHeader>
								<DrawerBody>
									{/* Grid de catégories - TOUS les items */}
									<div
										className={cn(
											"grid gap-2 max-w-md mx-auto",
											items.length === 3 ? "grid-cols-3" : "grid-cols-2"
										)}
									>
										{items.map((item) => {
											const isActive = item.value === activeValue;
											return (
												<Link
													key={item.value}
													href={item.href}
													prefetch={prefetch}
													onClick={() => setIsDrawerOpen(false)}
													aria-current={isActive ? "page" : undefined}
													className={cn(
														"flex items-center justify-center gap-2",
														"px-4 py-3.5 rounded-2xl",
														"text-sm font-medium text-center",
														"border-2 transition-all duration-150",
														"active:scale-[0.98]",
														"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
														isActive
															? "bg-primary text-primary-foreground border-primary shadow-md"
															: "bg-background border-border hover:border-primary/50"
													)}
												>
													{isActive && (
														<CheckIcon
															className="size-4 shrink-0"
															aria-hidden="true"
														/>
													)}
													<span className="leading-tight">{item.label}</span>
												</Link>
											);
										})}
									</div>
								</DrawerBody>
							</DrawerContent>
						</Drawer>
					</>
				)}
			</div>
		</nav>
	);
}
