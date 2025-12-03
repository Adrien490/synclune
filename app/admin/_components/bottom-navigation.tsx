"use client";

import { memo, useMemo, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { ExternalLink, LogOut, MoreHorizontal, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	getBottomNavPrimaryItems,
	getBottomNavSecondaryItems,
	type NavItem,
} from "./navigation-config";
import { isRouteActive } from "@/shared/lib/navigation";

// Récupérer les items depuis la configuration centralisée
const primaryItems = getBottomNavPrimaryItems();
const secondaryItems = getBottomNavSecondaryItems();

// Styles partagés pour les items de navigation
const navItemStyles = {
	base: "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] min-h-[48px] relative motion-safe:transition-all motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
	active: "text-foreground font-semibold",
	inactive: "text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium",
} as const;

const drawerItemStyles = {
	base: "flex flex-col items-center justify-center gap-2 p-4 rounded-lg relative motion-safe:transition-all motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	active: "bg-accent/50 text-foreground font-semibold",
	inactive: "text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium",
} as const;

interface BottomNavigationProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur écrans < 768px (md breakpoint)
 * Position fixed en bas de l'écran avec backdrop-blur
 */
export function BottomNavigation({ user }: BottomNavigationProps) {
	const pathname = usePathname();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Vérifie si une page du menu "Plus" est active (mémoïsé pour éviter les recalculs)
	const isMoreItemActive = useMemo(
		() => secondaryItems.some((item) => isRouteActive(pathname, item.url)),
		[pathname]
	);

	return (
		<nav
			className="md:hidden fixed bottom-0 left-0 right-0 z-[60] border-t bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60 pointer-events-auto"
			aria-label="Navigation mobile principale"
		>
			<div className="flex items-center justify-around h-16 px-4 safe-area-inset-bottom">
				{/* Items principaux */}
				{primaryItems.map((item) => (
					<BottomNavItem
						key={item.id}
						item={item}
						isActive={isRouteActive(pathname, item.url)}
					/>
				))}

				{/* Bouton "Plus" */}
				<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
					<DrawerTrigger asChild>
						<button
							type="button"
							className={cn(
								"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] relative",
								"motion-safe:transition-colors motion-safe:transition-transform",
								"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
								isMoreItemActive
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
								"motion-safe:active:scale-95"
							)}
							aria-label="Voir plus d'options"
							aria-expanded={isDrawerOpen}
							aria-haspopup="dialog"
						>
							{/* Indicateur actif si une page du menu "Plus" est active */}
							{isMoreItemActive && <ActiveIndicator />}
							<MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
							<span className="text-xs font-medium leading-none">Plus</span>
						</button>
					</DrawerTrigger>
					<DrawerContent bottomInset className="min-h-[60vh]">
						<DrawerHeader>
							<DrawerTitle>Plus d'options</DrawerTitle>
							<DrawerDescription>
								Accédez aux autres sections de l'administration
							</DrawerDescription>
						</DrawerHeader>

						<ScrollArea className="flex-1">
							{/* Section utilisateur */}
							<div className="px-4 pb-4">
								<div className="p-3 rounded-lg bg-accent/30">
									<p className="text-sm font-medium truncate">{user.name}</p>
									<p className="text-xs text-muted-foreground truncate">{user.email}</p>
								</div>
							</div>

							{/* Actions rapides */}
							<section
								aria-label="Actions rapides"
								className="px-4 pb-4 grid grid-cols-3 gap-3"
							>
								<Link
									href="/"
									target="_blank"
									rel="noopener noreferrer"
									onClick={() => setIsDrawerOpen(false)}
									aria-label="Voir le site (s'ouvre dans un nouvel onglet)"
									className={cn(
										drawerItemStyles.base,
										drawerItemStyles.inactive
									)}
								>
									<ExternalLink className="h-5 w-5" aria-hidden="true" />
									<span className="text-xs text-center">Voir le site</span>
								</Link>
								<Link
									href="/admin/compte"
									onClick={() => setIsDrawerOpen(false)}
									className={cn(
										drawerItemStyles.base,
										isRouteActive(pathname, "/admin/compte")
											? drawerItemStyles.active
											: drawerItemStyles.inactive
									)}
								>
									<User className="h-5 w-5" aria-hidden="true" />
									<span className="text-xs text-center">Mon compte</span>
								</Link>
								<LogoutAlertDialog>
									<button
										type="button"
										className={cn(
											drawerItemStyles.base,
											"w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
										)}
									>
										<LogOut className="h-5 w-5" aria-hidden="true" />
										<span className="text-xs text-center">Déconnexion</span>
									</button>
								</LogoutAlertDialog>
							</section>

							<Separator className="mx-4" />

							{/* Navigation secondaire */}
							<nav aria-label="Navigation secondaire" className="px-4 pt-4 pb-4">
								<ul className="grid grid-cols-3 gap-3" role="menu">
									{secondaryItems.map((item) => (
										<li key={item.id} role="none">
											<BottomNavDrawerItem
												item={item}
												isActive={isRouteActive(pathname, item.url)}
												onClick={() => setIsDrawerOpen(false)}
											/>
										</li>
									))}
								</ul>
							</nav>
						</ScrollArea>
					</DrawerContent>
				</Drawer>
			</div>
		</nav>
	);
}

/**
 * Item de navigation principal (barre du bas)
 * Mémoïsé pour éviter les re-renders inutiles
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
			<span className="text-xs leading-none">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
});

/**
 * Item du Drawer "Plus"
 * Mémoïsé pour éviter les re-renders inutiles
 */
const BottomNavDrawerItem = memo(function BottomNavDrawerItem({
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
			role="menuitem"
			className={cn(
				drawerItemStyles.base,
				isActive ? drawerItemStyles.active : drawerItemStyles.inactive
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
});

/**
 * Indicateur visuel pour l'item actif (barre verticale gauche)
 */
function ActiveIndicator() {
	return (
		<span
			className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-full"
			aria-hidden="true"
		/>
	);
}

