"use client";

import { useTransition } from "react";
import { cn } from "@/shared/utils/cn";
import { ROUTES } from "@/shared/constants/urls";
import { MapPin, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const isActive = (href: string) => pathname.startsWith(href);

	const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
		if (isActive(href)) return;
		e.preventDefault();
		startTransition(() => {
			router.push(href);
		});
	};

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
								onClick={(e) => handleNavigation(e, item.href)}
								aria-current={active ? "page" : undefined}
								className={cn(
									"pb-3 text-sm font-medium transition-colors",
									active
										? "text-foreground border-primary border-b-2"
										: "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
									isPending && "pointer-events-none opacity-70",
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* Mobile sticky top nav */}
			<nav
				aria-label="Navigation espace client"
				className={cn(
					"lg:hidden",
					"sticky top-[calc(var(--announcement-bar-height,0px)+var(--navbar-height))] z-30",
					"bg-background/80 backdrop-blur-md",
					"border-border/50 border-b",
					"-mx-4 mb-4 sm:-mx-6",
				)}
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Navigation espace client"
					className="divide-border/30 flex items-stretch divide-x"
				>
					{navItems.map((item) => {
						const active = isActive(item.href);
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={(e) => handleNavigation(e, item.href)}
								aria-current={active ? "page" : undefined}
								className={cn(
									"text-muted-foreground inline-flex min-h-11 flex-1 items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
									"active:scale-[0.98]",
									"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
									active && "text-foreground",
									isPending && "pointer-events-none opacity-70",
								)}
							>
								<Icon className="size-4" aria-hidden="true" />
								<span className="truncate">{item.label}</span>
								{active && (
									<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
								)}
							</Link>
						);
					})}
				</div>
			</nav>
		</>
	);
}
