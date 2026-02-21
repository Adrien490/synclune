"use client";

import { cn } from "@/shared/utils/cn";
import { useBottomBarHeight } from "@/shared/hooks";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { motion, useReducedMotion } from "motion/react";
import { LayoutDashboard, LogOut, MapPin, MessageSquare, Package, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: "/compte",
		label: "Tableau de bord",
		mobileLabel: "Accueil",
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
		href: "/adresses",
		label: "Adresses",
		icon: MapPin,
		desktopOnly: true,
	},
	{
		href: "/mes-demandes",
		label: "Mes demandes",
		icon: Sparkles,
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
	const prefersReducedMotion = useReducedMotion();

	const showDesktop = variant === "full" || variant === "desktop-only";
	const showMobile = variant === "full" || variant === "mobile-only";

	useBottomBarHeight(56, showMobile);

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
				<aside className="hidden lg:block w-56 shrink-0">
					<nav className="sticky top-28 flex flex-col gap-1">
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

						<div className="my-2 border-t border-border" />

						<LogoutAlertDialog>
							<button
								type="button"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
							>
								<LogOut className="size-5" />
								Se déconnecter
							</button>
						</LogoutAlertDialog>
					</nav>
				</aside>
			)}

			{/* Mobile Bottom Bar */}
			{showMobile && (
				<motion.nav
					initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={MOTION_CONFIG.spring.bar}
					className={cn(
						"lg:hidden",
						"fixed bottom-0 left-0 right-0 z-50",
						"pb-[env(safe-area-inset-bottom)]",
						"bg-background/95 backdrop-blur-md",
						"border-t border-x border-border",
						"rounded-t-2xl",
						"shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
					)}
					aria-label="Navigation espace client"
				>
					<div className="flex items-stretch h-14">
						{mobileItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);
							const label = "mobileLabel" in item ? item.mobileLabel : item.label;

							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex-1 flex flex-col items-center justify-center gap-1",
										"transition-colors duration-200",
										"active:scale-[0.98] active:bg-primary/10",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
										"relative",
										active
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									{active && (
										<span
											className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1.5 bg-primary rounded-full animate-in zoom-in-50 duration-200"
											aria-hidden="true"
										/>
									)}
									<Icon className="size-5" aria-hidden="true" />
									<span className="text-xs font-medium">{label}</span>
								</Link>
							);
						})}
					</div>
				</motion.nav>
			)}
		</>
	);
}
