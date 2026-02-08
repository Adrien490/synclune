"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, Gem } from "lucide-react";

interface MegaMenuCollectionsProps {
	collections?: NavItemChild[];
}

export function MegaMenuCollections({ collections }: MegaMenuCollectionsProps) {
	const pathname = usePathname();

	// Exclude "Toutes les collections" from cards (shown as CTA instead)
	const filteredCollections = collections?.filter(
		(c) => c.href !== "/collections",
	);

	if (!filteredCollections || filteredCollections.length === 0) {
		return null;
	}

	const isViewAllActive = pathname === "/collections";

	return (
		<div className="py-6">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Collections
			</h3>

			{/* CTA "Toutes les collections" */}
			<NavigationMenuLink asChild>
				<Link
					href="/collections"
					aria-current={isViewAllActive ? "page" : undefined}
					className={cn(
						"flex-row! flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold min-h-11",
						"bg-accent/40 hover:bg-accent",
						"text-foreground",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"transition-colors duration-200 mb-4",
						isViewAllActive && "bg-accent font-semibold"
					)}
				>
					Toutes les collections
					<ArrowRight className="size-3.5! text-muted-foreground" aria-hidden="true" />
				</Link>
			</NavigationMenuLink>

			{/* Collection cards - reproduces CollectionCard design */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{filteredCollections.map((collection) => {
					const isActive = pathname === collection.href;
					const displayImages = collection.images ?? [];

					return (
						<NavigationMenuLink key={collection.href} asChild>
							<Link
								href={collection.href}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"group/card flex flex-col! overflow-hidden rounded-xl bg-card",
									"border-2 border-transparent shadow-sm",
									"transition-[transform,border-color,box-shadow] duration-300 ease-out",
									"motion-reduce:transition-colors",
									"motion-safe:can-hover:hover:border-primary/40",
									"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
									"motion-safe:can-hover:hover:-translate-y-1 motion-safe:can-hover:hover:scale-[1.005]",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
									isActive && "border-primary/40"
								)}
							>
								{/* Images bento grid */}
								{displayImages.length > 0 ? (
									<CollectionImagesGrid
										images={displayImages}
										collectionName={collection.label}
									/>
								) : (
									<div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted flex items-center justify-center">
										<Gem className="size-6 text-muted-foreground/40" aria-hidden="true" />
									</div>
								)}

								{/* Centered title with decorative line */}
								<div className="px-3 pb-3 text-center">
									<div
										className={cn(
											"w-10 h-px mx-auto mb-2",
											"bg-linear-to-r from-transparent via-primary/40 to-transparent",
											"transition-[transform,opacity] duration-300 origin-center",
											"scale-x-[0.67]",
											"motion-reduce:scale-x-100",
											"motion-safe:can-hover:group-hover/card:scale-x-100 motion-safe:can-hover:group-hover/card:via-primary/60",
										)}
										aria-hidden="true"
									/>
									<span className={cn(
										"text-sm line-clamp-1",
										isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
									)}>
										{collection.label}
									</span>
								</div>
							</Link>
						</NavigationMenuLink>
					);
				})}
			</div>
		</div>
	);
}
