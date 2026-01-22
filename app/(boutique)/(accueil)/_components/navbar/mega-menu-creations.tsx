"use client";

import Link from "next/link";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { cn } from "@/shared/utils/cn";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
	newProducts?: unknown[];
}

export function MegaMenuCreations({ productTypes }: MegaMenuCreationsProps) {
	return (
		<div className="py-6">
			<div className="grid grid-cols-4 gap-8">
				{/* Catégories */}
				<div>
					<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Catégories
					</h3>
					<ul className="space-y-1">
						{productTypes?.map((type) => (
							<li key={type.href}>
								<NavigationMenuLink asChild>
									<Link
										href={type.href}
										className={cn(
											"block rounded-sm px-2 py-1.5 text-sm",
											"hover:bg-accent hover:text-accent-foreground",
											"transition-colors duration-150"
										)}
									>
										{type.label}
									</Link>
								</NavigationMenuLink>
							</li>
						))}
					</ul>
				</div>

				{/* Colonnes disponibles pour contenu futur */}
				<div className="col-span-3">
					{/* Contenu à enrichir */}
				</div>
			</div>

			{/* Footer */}
			<div className="mt-6 border-t border-border pt-4">
				<NavigationMenuLink asChild>
					<Link
						href="/produits"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Voir toutes les créations
					</Link>
				</NavigationMenuLink>
			</div>
		</div>
	);
}
