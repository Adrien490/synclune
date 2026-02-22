"use client";

import { cn } from "@/shared/utils/cn";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { ROUTES } from "@/shared/constants/urls";
import {
	Home,
	LogOut,
	MapPin,
	MessageSquare,
	Package,
	Settings,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: ROUTES.ACCOUNT.ROOT,
		label: "Tableau de bord",
		mobileLabel: "Accueil",
		icon: Home,
	},
	{
		href: ROUTES.ACCOUNT.ORDERS,
		label: "Commandes",
		icon: Package,
	},
	{
		href: ROUTES.ACCOUNT.REVIEWS,
		label: "Mes avis",
		icon: MessageSquare,
	},
	{
		href: ROUTES.ACCOUNT.ADDRESSES,
		label: "Adresses",
		icon: MapPin,
		desktopOnly: true,
	},
	{
		href: ROUTES.ACCOUNT.CUSTOMIZATIONS,
		label: "Mes demandes",
		icon: Sparkles,
		desktopOnly: true,
	},
	{
		href: ROUTES.ACCOUNT.SETTINGS,
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
		if (href === ROUTES.ACCOUNT.ROOT) {
			return pathname === ROUTES.ACCOUNT.ROOT;
		}
		return pathname.startsWith(href);
	};

	return (
		<>
			{/* Desktop Sidebar */}
			{showDesktop && (
				<aside className="hidden lg:block w-56 shrink-0 sticky top-28">
					<nav
						className="flex flex-col gap-1"
						aria-label="Navigation espace client"
					>
						{navItems.map((item) => {
							const active = isActive(item.href);
							const Icon = item.icon;

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2",
										active
											? "bg-muted text-foreground border-primary"
											: "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
									)}
								>
									<Icon className="size-4 shrink-0" aria-hidden="true" />
									{item.label}
								</Link>
							);
						})}

						<div className="my-2 border-t border-border" />

						<LogoutAlertDialog>
							<button
								type="button"
								className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left border-l-2 border-transparent"
							>
								<LogOut className="size-4 shrink-0" aria-hidden="true" />
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
							const Icon = item.icon;

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									className={cn(bottomBarItemClass, active && bottomBarActiveItemClass)}
								>
									{active && <ActiveDot />}
									<Icon className={bottomBarIconClass} aria-hidden="true" />
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
