"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/utils/cn";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	getBottomNavPrimaryItems,
	getAllNavItems,
	type NavItem,
} from "./navigation-config";
import { isRouteActive } from "@/shared/lib/navigation";
import {
	MobilePanel,
	MobilePanelItem,
	mobilePanelItemVariants,
} from "@/shared/components/ui/mobile-panel";

// Recuperer les items depuis la configuration centralisee
const primaryItems = getBottomNavPrimaryItems();
// Tous les items pour le menu (exclure alertes stock)
const allMenuItems = getAllNavItems().filter(
	(item) => item.id !== "stock-alerts"
);

// Styles partages pour les items de navigation
const sharedItemStyles = {
	focusRing:
		"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
	transition: "motion-safe:transition-all motion-safe:active:scale-95",
	layout: "flex flex-col items-center justify-center rounded-lg relative",
} as const;

const navItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		"gap-1 px-3 py-2 min-w-[64px] min-h-[48px]"
	),
	active: "text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
} as const;

const panelItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		// Touch targets ameliores pour WCAG AAA (min 44x44, ici 76x76)
		"gap-1.5 py-3 px-2 min-h-[76px] min-w-[76px] rounded-xl",
		// Reset pour que les boutons s'alignent comme les liens
		"border-0 bg-transparent appearance-none cursor-pointer"
	),
	active: "bg-accent/50 text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
	destructive:
		"text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 font-medium",
} as const;


interface BottomNavigationProps {
	className?: string;
}

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur ecrans < 768px (md breakpoint)
 * Position fixed en bas de l'ecran avec backdrop-blur
 */
export function BottomNavigation({ className }: BottomNavigationProps) {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const shouldReduceMotion = useReducedMotion();

	// Verifie si une page du menu est active (hors items primaires)
	const primaryIds = new Set(primaryItems.map((item) => item.id));
	const isMenuItemActive = allMenuItems
		.filter((item) => !primaryIds.has(item.id))
		.some((item) => isRouteActive(pathname, item.url));

	const closePanel = useCallback(() => setIsOpen(false), []);
	const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

	// Fermer le panneau quand on change de page (back button navigateur)
	useEffect(() => {
		closePanel();
	}, [pathname, closePanel]);

	return (
		<>
			{/* Panneau de navigation mobile */}
			<MobilePanel
				isOpen={isOpen}
				onClose={closePanel}
				ariaLabel="Menu de navigation"
				enableStagger
			>
				{/* Grille de navigation - 3 colonnes */}
				<div className="grid grid-cols-3 gap-2 p-3 pb-2">
					{allMenuItems.map((item) => (
						<PanelNavItem
							key={item.id}
							item={item}
							isActive={isRouteActive(pathname, item.url)}
							onClick={closePanel}
							shouldReduceMotion={shouldReduceMotion ?? false}
						/>
					))}

					{/* Deconnexion */}
					<MobilePanelItem>
						<LogoutAlertDialog>
							<button
								type="button"
								className={cn(
									panelItemStyles.base,
									panelItemStyles.destructive,
									"w-full"
								)}
								aria-label="Deconnexion de votre compte administrateur"
							>
								<LogOut className="size-6 shrink-0" aria-hidden="true" />
								<span className="text-xs text-center leading-tight tracking-tight">
									Deconnexion
								</span>
							</button>
						</LogoutAlertDialog>
					</MobilePanelItem>
				</div>

				{/* Voir le site - pleine largeur en bas */}
				<div className="px-3 pb-3">
					<Link
						href="/"
						target="_blank"
						rel="noopener noreferrer"
						onClick={closePanel}
						className={cn(
							"flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl",
							"bg-primary text-primary-foreground font-medium",
							"hover:bg-primary/90 active:bg-primary/80",
							sharedItemStyles.transition,
							sharedItemStyles.focusRing
						)}
						aria-label="Voir le site (s'ouvre dans un nouvel onglet)"
					>
						<ExternalLink className="size-5 shrink-0" aria-hidden="true" />
						<span className="text-sm font-medium">Voir le site</span>
					</Link>
				</div>
			</MobilePanel>

			{/* Navigation bar */}
			<nav
				className="md:hidden fixed bottom-0 left-0 right-0 z-[60] border-t bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60 pointer-events-auto"
				aria-label="Navigation mobile principale"
			>
				<div className="flex items-center justify-around h-16 px-4 pb-[env(safe-area-inset-bottom)]">
					{/* Items principaux */}
					{primaryItems.map((item) => (
						<BottomNavItem
							key={item.id}
							item={item}
							isActive={isRouteActive(pathname, item.url)}
						/>
					))}

					{/* Bouton "Menu" */}
					<button
						type="button"
						onClick={togglePanel}
						className={cn(
							"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] min-h-[48px] relative",
							"motion-safe:transition-colors motion-safe:transition-transform",
							"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
							isMenuItemActive || isOpen
								? "text-foreground font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30",
							"motion-safe:active:scale-95"
						)}
						aria-label="Ouvrir le menu"
						aria-expanded={isOpen}
						aria-haspopup="dialog"
					>
						{/* Indicateur actif si une page du menu est active */}
						{(isMenuItemActive || isOpen) && <ActiveIndicator />}
						<Menu
							className="h-5 w-5 shrink-0"
							aria-hidden="true"
						/>
						<span className="text-[13px] font-medium leading-none">Menu</span>
					</button>
				</div>
			</nav>
		</>
	);
}

/**
 * Item de navigation principal (barre du bas)
 * Memoïse pour eviter les re-renders inutiles
 */
const BottomNavItem = memo(function BottomNavItem({
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
				navItemStyles.base,
				isActive ? navItemStyles.active : navItemStyles.inactive
			)}
			aria-label={item.title}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			<span className="text-[13px] leading-none">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
});

/**
 * Item de navigation dans le panneau "Plus"
 * Memoïse pour eviter les re-renders inutiles
 */
const PanelNavItem = memo(function PanelNavItem({
	item,
	isActive,
	onClick,
	shouldReduceMotion,
}: {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
	shouldReduceMotion: boolean;
}) {
	const Icon = item.icon;

	return (
		<motion.div variants={shouldReduceMotion ? undefined : mobilePanelItemVariants}>
			<Link
				href={item.url}
				onClick={onClick}
				className={cn(
					panelItemStyles.base,
					isActive ? panelItemStyles.active : panelItemStyles.inactive
				)}
				aria-current={isActive ? "page" : undefined}
			>
				{isActive && <ActiveIndicator />}
				<Icon className="size-6 shrink-0" aria-hidden="true" />
				<span className="text-xs text-center leading-tight tracking-tight line-clamp-2">
					{item.shortTitle || item.title}
				</span>
			</Link>
		</motion.div>
	);
});

/**
 * Indicateur visuel pour l'item actif (barre horizontale en haut - style iOS)
 */
function ActiveIndicator() {
	return (
		<span
			className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 bg-primary rounded-full motion-safe:animate-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
			aria-hidden="true"
		/>
	);
}
