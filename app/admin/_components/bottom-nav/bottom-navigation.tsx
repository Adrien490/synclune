"use client";

import { useState, useEffect } from "react";
import { cn } from "@/shared/utils/cn";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
	getBottomNavPrimaryItems,
	getAllNavItems,
} from "../navigation-config";

// Lazy loading - dialog charge uniquement a l'ouverture
const LogoutAlertDialog = dynamic(
	() => import("@/modules/auth/components/logout-alert-dialog").then((mod) => mod.LogoutAlertDialog),
	{ ssr: false }
);
import { isRouteActive } from "@/shared/lib/navigation";
import {
	Drawer,
	DrawerContent,
	DrawerBody,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { BottomNavItem } from "./bottom-nav-item";
import { PanelNavItem } from "./panel-nav-item";
import { sharedItemStyles, panelItemStyles } from "./styles";
import { ActiveIndicator } from "./active-indicator";

// Recuperer les items depuis la configuration centralisee
const primaryItems = getBottomNavPrimaryItems();
// Tous les items pour le menu (exclure alertes stock)
const allMenuItems = getAllNavItems().filter(
	(item) => item.id !== "stock-alerts"
);

interface BottomNavigationProps {
	className?: string;
}

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur ecrans < 768px (md breakpoint)
 * Position fixed en bas de l'ecran avec backdrop-blur
 */
export function BottomNav({ className }: BottomNavigationProps) {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);

	// Verifie si une page du menu est active (hors items primaires)
	const primaryIds = new Set(primaryItems.map((item) => item.id));
	const isMenuItemActive = allMenuItems
		.filter((item) => !primaryIds.has(item.id))
		.some((item) => isRouteActive(pathname, item.url));

	const closeDrawer = () => setIsOpen(false);
	const toggleDrawer = () => setIsOpen((prev) => !prev);

	// Fermer le drawer quand on change de page (back button navigateur)
	useEffect(() => {
		closeDrawer();
	}, [pathname]);

	return (
		<>
			{/* Drawer de navigation mobile */}
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerContent>
					<DrawerTitle className="sr-only">Menu de navigation</DrawerTitle>
					<DrawerBody className="pt-2">
						{/* Grille de navigation - 3 colonnes */}
						<div className="grid grid-cols-3 gap-2 p-3 pb-2">
							{allMenuItems.map((item) => (
								<PanelNavItem
									key={item.id}
									item={item}
									isActive={isRouteActive(pathname, item.url)}
									onClick={closeDrawer}
								/>
							))}

							{/* Deconnexion */}
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
						</div>

						{/* Voir le site - pleine largeur en bas */}
						<div className="px-3 pb-3">
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								onClick={closeDrawer}
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
					</DrawerBody>
				</DrawerContent>
			</Drawer>

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
						onClick={toggleDrawer}
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
						<span className="text-sm font-medium leading-none">Menu</span>
					</button>
				</div>
			</nav>
		</>
	);
}
