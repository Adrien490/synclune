"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { cn } from "@/shared/utils/cn";
import { MegaMenuColumn } from "./mega-menu-column";
import { Flame } from "lucide-react";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
}

export function MegaMenuCreations({ productTypes }: MegaMenuCreationsProps) {
	const pathname = usePathname();

	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	const bestsellerHref = "/produits?sortBy=best-selling";
	const isBestsellerActive = pathname === "/produits" && typeof window !== "undefined" && window.location.search.includes("sortBy=best-selling");

	return (
		<div className="flex gap-10 py-6">
			{/* Main categories in multi-column grid */}
			<div className="flex-1">
				<MegaMenuColumn title="Catégories" items={productTypes} columns={2} />
			</div>

			{/* Sidebar: best-sellers highlight */}
			<div className="w-48 shrink-0 border-l border-border pl-8">
				<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Populaire
				</h3>
				<NavigationMenuLink asChild>
					<Link
						href={bestsellerHref}
						aria-current={isBestsellerActive ? "page" : undefined}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium min-h-11",
							"hover:bg-accent hover:text-accent-foreground",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							"transition-colors duration-200",
							isBestsellerActive && "bg-accent/50 font-medium"
						)}
					>
						<Flame className="size-4 text-orange-500" aria-hidden="true" />
						Meilleures ventes
					</Link>
				</NavigationMenuLink>
			</div>
		</div>
	);
}
