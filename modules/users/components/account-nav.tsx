"use client";

import { cn } from "@/shared/utils/cn";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { Home, MessageSquare, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: "/compte",
		label: "Tableau de bord",
		mobileLabel: "Accueil",
		icon: Home,
	},
	{
		href: "/commandes",
		label: "Commandes",
		icon: Package,
	},
	{
		href: "/mes-avis",
		label: "Mes avis",
		icon: MessageSquare,
	},
	{
		href: "/adresses",
		label: "Adresses",
		desktopOnly: true,
	},
	{
		href: "/mes-demandes",
		label: "Mes demandes",
		desktopOnly: true,
	},
	{
		href: "/parametres",
		label: "Paramètres",
		icon: Settings,
	},
] as const;

const mobileItems = navItems.filter(
	(item) => !("desktopOnly" in item && item.desktopOnly)
);

interface AccountNavProps {
	/** Variant pour afficher seulement mobile ou desktop */
	variant?: "full" | "mobile-only" | "desktop-only";
}

/**
 * Navigation de l'espace client
 * - Desktop : Sidebar a gauche (sticky)
 * - Mobile : Bottom bar fixe avec animation d'entree
 *
 * @param variant - "full" (defaut) affiche les deux, "mobile-only" ou "desktop-only"
 */
export function AccountNav({ variant = "full" }: AccountNavProps) {
	const pathname = usePathname();

	const showDesktop = variant === "full" || variant === "desktop-only";
	const showMobile = variant === "full" || variant === "mobile-only";

	const isActive = (href: string) => {
		if (href === "/compte") {
			return pathname === "/compte";
		}
		return pathname.startsWith(href);
	};

	return (
		<>
			{/* Desktop Sidebar */}
			{showDesktop && (
				<aside className="hidden lg:block w-56 shrink-0 sticky top-28">
					<nav className="flex flex-col gap-1">
						{navItems.map((item) => {
							const active = isActive(item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
										active
											? "bg-muted text-foreground border-l-2 border-primary"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									)}
								>
									{item.label}
								</Link>
							);
						})}

						<div className="my-2 border-t border-border" />

						<LogoutAlertDialog>
							<button
								type="button"
								className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
							>
								Se déconnecter
							</button>
						</LogoutAlertDialog>
					</nav>
				</aside>
			)}

			{/* Mobile Bottom Bar */}
			{showMobile && (
				<BottomBar
					as="nav"
					breakpointClass="lg:hidden"
					enabled={showMobile}
					aria-label="Navigation espace client"
				>
					<div className={bottomBarContainerClass}>
						{mobileItems.map((item) => {
							const active = isActive(item.href);
							const label = "mobileLabel" in item ? item.mobileLabel : item.label;
							const Icon = "icon" in item ? item.icon : null;

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									className={bottomBarItemClass}
								>
									{active && <ActiveDot />}
									{Icon && <Icon className={bottomBarIconClass} aria-hidden="true" />}
									<span className={bottomBarLabelClass}>{label}</span>
								</Link>
							);
						})}
					</div>
				</BottomBar>
			)}
		</>
	);
}
