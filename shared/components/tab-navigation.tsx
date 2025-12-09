"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
	MobilePanel,
	MobilePanelItem,
} from "@/shared/components/ui/mobile-panel";
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

/** Classes de base pour les pills */
const PILL_BASE =
	"inline-flex items-center justify-center gap-1.5 h-11 md:h-10 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200";

/**
 * Composant de navigation par onglets
 *
 * - Desktop : tous les onglets en ligne
 * - Mobile : N premiers onglets + bouton "Plus" ouvrant un panel
 */
export function TabNavigation({
	items,
	activeValue,
	ariaLabel = "Navigation principale",
	prefetch = false,
	mobileVisibleCount = 2,
}: TabNavigationProps) {
	const [isPanelOpen, setIsPanelOpen] = useState(false);

	// Séparer les items visibles et ceux dans le panel mobile
	const visibleItems = items.slice(0, mobileVisibleCount);
	const overflowItems = items.slice(mobileVisibleCount);
	const hasOverflow = overflowItems.length > 0;

	// Trouver l'item actif s'il est dans l'overflow
	const activeOverflowItem = overflowItems.find(
		(item) => item.value === activeValue
	);

	const renderCount = (count: number | undefined, isActive: boolean) => {
		if (count === undefined) return null;

		return (
			<span
				title={`${count} élément${count > 1 ? "s" : ""}`}
				className={cn(
					"ml-1.5 inline-flex items-center justify-center",
					"min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium",
					isActive
						? "bg-primary-foreground/20 text-primary-foreground"
						: "bg-muted-foreground/20 text-muted-foreground"
				)}
			>
				{count}
			</span>
		);
	};

	const getPillClasses = (isActive: boolean) =>
		cn(
			PILL_BASE,
			isActive
				? "bg-primary text-primary-foreground shadow-sm"
				: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
		);

	return (
		<nav aria-label={ariaLabel} className="w-full">
			<div className="flex gap-2">
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
							{renderCount(item.count, isActive)}
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
							{renderCount(item.count, isActive)}
						</Link>
					);
				})}

				{/* Bouton "Plus" - visible uniquement sur mobile */}
				{hasOverflow && (
					<>
						<button
							type="button"
							onClick={() => setIsPanelOpen(true)}
							className={cn(
								PILL_BASE,
								"md:hidden",
								activeOverflowItem
									? "bg-primary text-primary-foreground shadow-sm"
									: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
							)}
							aria-label="Plus d'options de navigation"
							aria-expanded={isPanelOpen}
							aria-haspopup="dialog"
						>
							<span className="truncate">
								{activeOverflowItem?.label || "Plus"}
							</span>
							<ChevronDownIcon
								className={cn(
									"h-4 w-4 shrink-0 transition-transform duration-200",
									isPanelOpen && "rotate-180"
								)}
								aria-hidden="true"
							/>
						</button>

						<MobilePanel
							isOpen={isPanelOpen}
							onClose={() => setIsPanelOpen(false)}
							ariaLabel="Options de navigation"
							enableStagger
							showCloseButton={false}
							className="p-3"
						>
							<nav aria-label="Options de navigation supplémentaires">
								{overflowItems.map((item) => {
									const isActive = item.value === activeValue;
									return (
										<MobilePanelItem key={item.value}>
											<Link
												href={item.href}
												prefetch={prefetch}
												onClick={() => setIsPanelOpen(false)}
												aria-current={isActive ? "page" : undefined}
												className={cn(
													"flex items-center justify-between w-full",
													"px-4 py-3 rounded-xl",
													"text-sm font-medium",
													"transition-colors duration-200",
													isActive
														? "bg-primary text-primary-foreground"
														: "text-foreground hover:bg-muted"
												)}
											>
												{item.label}
												{item.count !== undefined && (
													<span
														className={cn(
															"text-xs",
															isActive
																? "text-primary-foreground/70"
																: "text-muted-foreground"
														)}
													>
														{item.count}
													</span>
												)}
											</Link>
										</MobilePanelItem>
									);
								})}
							</nav>
						</MobilePanel>
					</>
				)}
			</div>
		</nav>
	);
}
