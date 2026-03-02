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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Separator } from "@/shared/components/ui/separator";
import { ROUTES } from "@/shared/constants/urls";
import {
	Ellipsis,
	Heart,
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
import { useState } from "react";

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
		href: ROUTES.ACCOUNT.FAVORITES,
		label: "Favoris",
		icon: Heart,
		desktopOnly: true,
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

const mobileItems = navItems.filter((item) => !("desktopOnly" in item));

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
const desktopOnlyItems = navItems.filter((item) => "desktopOnly" in item);

export function AccountNav({ variant = "full" }: AccountNavProps) {
	const pathname = usePathname();
	const [moreOpen, setMoreOpen] = useState(false);

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
				<aside className="sticky top-28 hidden w-56 shrink-0 lg:block">
					<nav className="flex flex-col gap-1" aria-label="Navigation espace client">
						{navItems.map((item) => {
							const active = isActive(item.href);
							const Icon = item.icon;

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex items-center gap-2.5 rounded-lg border-l-2 px-4 py-2.5 text-sm font-medium transition-colors",
										active
											? "bg-muted text-foreground border-primary"
											: "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
									)}
								>
									<Icon className="size-4 shrink-0" aria-hidden="true" />
									{item.label}
								</Link>
							);
						})}

						<div className="border-border my-2 border-t" />

						<LogoutAlertDialog>
							<button
								type="button"
								className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2.5 rounded-lg border-l-2 border-transparent px-4 py-2.5 text-left text-sm font-medium transition-colors"
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
						<button
							type="button"
							onClick={() => setMoreOpen(true)}
							className={bottomBarItemClass}
							aria-label="Plus d'options"
						>
							<Ellipsis className={bottomBarIconClass} aria-hidden="true" />
							<span className={bottomBarLabelClass}>Plus</span>
						</button>
					</div>
				</BottomBar>
			)}

			{/* Mobile "Plus" Sheet */}
			{showMobile && (
				<Sheet direction="bottom" open={moreOpen} onOpenChange={setMoreOpen}>
					<SheetContent className="rounded-t-2xl">
						<SheetHeader>
							<SheetTitle>Plus d'options</SheetTitle>
						</SheetHeader>
						<nav className="flex flex-col gap-1 px-4 pb-4" aria-label="Navigation supplementaire">
							{desktopOnlyItems.map((item) => {
								const Icon = item.icon;
								const active = isActive(item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMoreOpen(false)}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
											active
												? "bg-muted text-foreground"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
									>
										<Icon className="size-4 shrink-0" aria-hidden="true" />
										{item.label}
									</Link>
								);
							})}
							<Separator className="my-1" />
							<LogoutAlertDialog>
								<button
									type="button"
									className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors"
								>
									<LogOut className="size-4 shrink-0" aria-hidden="true" />
									Se déconnecter
								</button>
							</LogoutAlertDialog>
						</nav>
					</SheetContent>
				</Sheet>
			)}
		</>
	);
}
