"use client";

import { cn } from "@/shared/utils/cn";
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
import { MapPin, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: ROUTES.ACCOUNT.ORDERS,
		label: "Commandes",
		icon: Package,
	},
	{
		href: ROUTES.ACCOUNT.ADDRESSES,
		label: "Adresses",
		icon: MapPin,
	},
	{
		href: ROUTES.ACCOUNT.SETTINGS,
		label: "Paramètres",
		icon: Settings,
	},
] as const;

export function AccountTabsNav() {
	const pathname = usePathname();

	const isActive = (href: string) => pathname.startsWith(href);

	return (
		<>
			{/* Desktop tabs */}
			<nav
				className="border-border/60 mb-6 hidden border-b lg:block"
				aria-label="Navigation espace client"
			>
				<div className="-mb-px flex gap-6">
					{navItems.map((item) => {
						const active = isActive(item.href);

						return (
							<Link
								key={item.href}
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"pb-3 text-sm font-medium transition-colors",
									active
										? "text-foreground border-primary border-b-2"
										: "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* Mobile bottom bar */}
			<BottomBar as="nav" breakpointClass="lg:hidden" aria-label="Navigation espace client">
				<div className={bottomBarContainerClass}>
					{navItems.map((item) => {
						const active = isActive(item.href);
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
								<span className={bottomBarLabelClass}>{item.label}</span>
							</Link>
						);
					})}
				</div>
			</BottomBar>
		</>
	);
}
