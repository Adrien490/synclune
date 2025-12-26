"use client";

import { cn } from "@/shared/utils/cn";
import { Heart, LayoutDashboard, MessageSquare, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: "/compte",
		label: "Tableau de bord",
		icon: LayoutDashboard,
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
		href: "/favoris",
		label: "Favoris",
		icon: Heart,
	},
	{
		href: "/parametres",
		label: "Paramètres",
		icon: Settings,
	},
];

interface AccountNavProps {
	/** Variant pour afficher seulement mobile ou desktop */
	variant?: "full" | "mobile-only" | "desktop-only";
}

/**
 * Navigation de l'espace client
 * - Desktop : Sidebar à gauche (sticky)
 * - Mobile : Bottom tabs fixes
 *
 * @param variant - "full" (défaut) affiche les deux, "mobile-only" ou "desktop-only"
 */
export function AccountNav({ variant = "full" }: AccountNavProps) {
	const pathname = usePathname();

	const isActive = (href: string) => {
		if (href === "/compte") {
			return pathname === "/compte";
		}
		return pathname.startsWith(href);
	};

	const showDesktop = variant === "full" || variant === "desktop-only";
	const showMobile = variant === "full" || variant === "mobile-only";

	return (
		<>
			{/* Desktop Sidebar */}
			{showDesktop && (
				<aside className="hidden lg:block w-56 shrink-0">
					<nav className="sticky top-28 space-y-1">
						{navItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
										active
											? "bg-muted text-foreground"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									)}
								>
									<Icon className="size-5" />
									{item.label}
								</Link>
							);
						})}
					</nav>
				</aside>
			)}

			{/* Mobile Bottom Tabs */}
			{showMobile && (
				<nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
					<div className="flex items-center justify-around py-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
										active ? "text-foreground" : "text-muted-foreground"
									)}
								>
									<Icon className="size-5" />
									<span className="text-xs font-medium">{item.label}</span>
								</Link>
							);
						})}
					</div>
				</nav>
			)}
		</>
	);
}
