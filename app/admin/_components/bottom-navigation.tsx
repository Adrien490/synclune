"use client";

import { memo, useState } from "react";
import { cn } from "@/shared/utils/cn";
import {
	ChevronRight,
	ExternalLink,
	LogOut,
	MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/shared/components/ui/avatar";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	getBottomNavPrimaryItems,
	getBottomNavSecondaryGroups,
	getBottomNavSecondaryItems,
	type NavGroup,
	type NavItem,
} from "./navigation-config";
import { isRouteActive } from "@/shared/lib/navigation";

// Récupérer les items depuis la configuration centralisée
const primaryItems = getBottomNavPrimaryItems();
const secondaryGroups = getBottomNavSecondaryGroups();
const secondaryItems = getBottomNavSecondaryItems();

// Styles partagés pour les items de navigation
const navItemStyles = {
	base: "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] min-h-[48px] relative motion-safe:transition-all motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
	active: "text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium",
} as const;

const drawerItemStyles = {
	base: "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg relative motion-safe:transition-all motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	active: "bg-accent/50 text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium",
} as const;

interface BottomNavigationProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

/**
 * Génère les initiales à partir d'un nom
 */
function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur écrans < 768px (md breakpoint)
 * Position fixed en bas de l'écran avec backdrop-blur
 */
export function BottomNavigation({ user }: BottomNavigationProps) {
	const pathname = usePathname();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Vérifie si une page du menu "Plus" est active
	const isMoreItemActive = secondaryItems.some((item) => isRouteActive(pathname, item.url));

	const closeDrawer = () => setIsDrawerOpen(false);

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
							<MoreHorizontal
								className="h-5 w-5 shrink-0"
								aria-hidden="true"
							/>
							<span className="text-xs font-medium leading-none">Plus</span>
						</button>
					</DrawerTrigger>
					<DrawerContent className="max-h-[70vh]">
						<DrawerHeader className="sr-only">
							<DrawerTitle>Menu</DrawerTitle>
						</DrawerHeader>

						<ScrollArea className="flex-1 min-h-0">
							<div className="space-y-6 pb-4">
								{/* User Card cliquable */}
								<Link
									href="/admin/compte"
									onClick={closeDrawer}
									className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
								>
									<Avatar className="h-10 w-10">
										<AvatarImage src={user.avatar} alt={user.name} />
										<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{user.name}</p>
										<p className="text-xs text-muted-foreground truncate">
											{user.email}
										</p>
									</div>
									<ChevronRight
										className="h-4 w-4 text-muted-foreground shrink-0"
										aria-hidden="true"
									/>
								</Link>

								{/* Groupes de navigation */}
								{secondaryGroups.map((group) => (
									<DrawerNavGroup
										key={group.label}
										group={group}
										pathname={pathname}
										onClose={closeDrawer}
									/>
								))}
							</div>
						</ScrollArea>

						{/* Footer sticky avec actions */}
						<DrawerFooter className="border-t pt-3 mt-0">
							{/* Voir le site */}
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								onClick={closeDrawer}
								className={cn(
									"w-full flex items-center justify-center gap-2 p-3 rounded-lg",
									"text-muted-foreground hover:text-foreground hover:bg-accent/50",
									"motion-safe:transition-all motion-safe:active:scale-95",
									"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
								)}
								aria-label="Voir le site (s'ouvre dans un nouvel onglet)"
							>
								<ExternalLink className="h-5 w-5" aria-hidden="true" />
								<span className="text-sm font-medium">Voir le site</span>
							</Link>

							<Separator />

							{/* Déconnexion */}
							<LogoutAlertDialog>
								<button
									type="button"
									className={cn(
										"w-full flex items-center justify-center gap-2 p-3 rounded-lg",
										"text-muted-foreground hover:text-destructive hover:bg-destructive/10",
										"motion-safe:transition-all motion-safe:active:scale-95",
										"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
									)}
								>
									<LogOut className="h-5 w-5" aria-hidden="true" />
									<span className="text-sm font-medium">Déconnexion</span>
								</button>
							</LogoutAlertDialog>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</div>
		</nav>
	);
}

/**
 * Groupe de navigation dans le drawer
 */
const DrawerNavGroup = memo(function DrawerNavGroup({
	group,
	pathname,
	onClose,
}: {
	group: NavGroup;
	pathname: string;
	onClose: () => void;
}) {
	const GroupIcon = group.icon;

	return (
		<section aria-label={group.label} className="space-y-2">
			<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
				{GroupIcon && <GroupIcon className="h-3.5 w-3.5" aria-hidden="true" />}
				{group.label}
			</div>
			<div className="grid grid-cols-2 gap-2">
				{group.items.map((item) => (
					<BottomNavDrawerItem
						key={item.id}
						item={item}
						isActive={isRouteActive(pathname, item.url)}
						onClick={onClose}
					/>
				))}
			</div>
		</section>
	);
});

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
 * Indicateur visuel pour l'item actif (barre horizontale en haut - style iOS)
 */
function ActiveIndicator() {
	return (
		<span
			className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-primary rounded-full"
			aria-hidden="true"
		/>
	);
}
