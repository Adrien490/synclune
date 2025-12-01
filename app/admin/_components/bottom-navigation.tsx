"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
	getBottomNavPrimaryItems,
	getBottomNavSecondaryItems,
	type NavItem,
} from "./navigation-config";
import { isRouteActive } from "@/shared/lib/navigation";

// Récupérer les items depuis la configuration centralisée
const primaryItems = getBottomNavPrimaryItems();
const secondaryItems = getBottomNavSecondaryItems();

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur écrans < 768px (md breakpoint)
 * Position fixed en bas de l'écran avec backdrop-blur
 */
export function BottomNavigation() {
	const pathname = usePathname();
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	// Vérifie si une page du menu "Plus" est active
	const isMoreItemActive = secondaryItems.some((item) =>
		isRouteActive(pathname, item.url)
	);

	return (
		<nav
			className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60"
			aria-label="Navigation mobile principale"
		>
			<div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
				{/* Items principaux */}
				{primaryItems.map((item) => (
					<BottomNavItem
						key={item.id}
						item={item}
						isActive={isRouteActive(pathname, item.url)}
					/>
				))}

				{/* Bouton "Plus" */}
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<button
							type="button"
							className={cn(
								"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] relative",
								"motion-safe:transition-colors motion-safe:transition-transform",
								isMoreItemActive
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
								"motion-safe:active:scale-95"
							)}
							aria-label="Voir plus d'options"
							aria-expanded={isSheetOpen}
							aria-haspopup="dialog"
						>
							{/* Indicateur actif si une page du menu "Plus" est active */}
							{isMoreItemActive && <ActiveIndicator />}
							<MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
							<span className="text-xs font-medium leading-none">Plus</span>
						</button>
					</SheetTrigger>
					<SheetContent
						side="bottom"
						className="h-auto max-h-[70vh] rounded-t-xl"
					>
						<SheetHeader className="pb-4">
							<SheetTitle>Plus d'options</SheetTitle>
						</SheetHeader>
						<nav aria-label="Navigation secondaire">
							<ul className="grid grid-cols-3 gap-2">
								{secondaryItems.map((item) => (
									<li key={item.id}>
										<BottomNavSheetItem
											item={item}
											isActive={isRouteActive(pathname, item.url)}
											onClick={() => setIsSheetOpen(false)}
										/>
									</li>
								))}
							</ul>
						</nav>
					</SheetContent>
				</Sheet>
			</div>
		</nav>
	);
}

/**
 * Item de navigation principal (barre du bas)
 */
function BottomNavItem({
	item,
	isActive,
}: {
	item: NavItem;
	isActive: boolean;
}) {
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			className={cn(
				"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] relative",
				"motion-safe:transition-all motion-safe:active:scale-95",
				isActive
					? "text-foreground font-semibold"
					: "text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium"
			)}
			aria-label={item.title}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			<span className="text-xs leading-none">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
}

/**
 * Item du Sheet "Plus"
 */
function BottomNavSheetItem({
	item,
	isActive,
	onClick,
}: {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
}) {
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			onClick={onClick}
			className={cn(
				"flex flex-col items-center justify-center gap-2 p-3 rounded-lg relative",
				"motion-safe:transition-all motion-safe:active:scale-95",
				"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				isActive
					? "bg-accent/50 text-foreground font-semibold"
					: "text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium"
			)}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			<span className="text-xs text-center leading-tight">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
}

/**
 * Indicateur visuel pour l'item actif (barre verticale gauche)
 */
function ActiveIndicator() {
	return (
		<span
			className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-primary rounded-full"
			aria-hidden="true"
		/>
	);
}

