"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, Gem } from "lucide-react";

interface MegaMenuCollectionsProps {
	collections?: NavItemChild[];
}

export function MegaMenuCollections({ collections }: MegaMenuCollectionsProps) {
	const headingId = useId();
	const pathname = usePathname();

	// Exclude "Toutes les collections" from cards (shown as CTA instead)
	const filteredCollections = collections?.filter((c) => c.href !== ROUTES.SHOP.COLLECTIONS);

	if (!filteredCollections || filteredCollections.length === 0) {
		return null;
	}

	const isViewAllActive = pathname === ROUTES.SHOP.COLLECTIONS;

	return (
		<div className="py-6" role="region" aria-labelledby={headingId}>
			<h3
				id={headingId}
				className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase"
			>
				Collections
			</h3>

			{/* CTA "Toutes les collections" */}
			<NavigationMenuLink asChild>
				<Link
					href={ROUTES.SHOP.COLLECTIONS}
					aria-current={isViewAllActive ? "page" : undefined}
					className={cn(
						"flex min-h-11 flex-row! items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
						"bg-accent/40 hover:bg-accent",
						"text-foreground",
						"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						"mb-4 transition-colors duration-200",
						"motion-safe:animate-[menu-item-in_0.25s_ease-out_both]",
						isViewAllActive && "bg-accent font-medium",
					)}
				>
					Toutes les collections
					<ArrowRight className="text-muted-foreground size-3.5!" aria-hidden="true" />
				</Link>
			</NavigationMenuLink>

			{/* Collection cards - reproduces CollectionCard design */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{filteredCollections.map((collection, index) => {
					const isActive = pathname === collection.href;
					const displayImages = collection.images ?? [];
					return (
						<div
							key={collection.href}
							className="motion-safe:animate-[menu-item-in_0.25s_ease-out_both]"
							style={{ animationDelay: `${(index + 1) * 50}ms` }}
						>
							<NavigationMenuLink asChild>
								<Link
									href={collection.href}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"group/card bg-card flex flex-col! overflow-hidden rounded-xl",
										"border-2 border-transparent shadow-sm",
										"transition-[transform,border-color,box-shadow] duration-300 ease-out",
										"motion-reduce:transition-colors",
										"motion-safe:can-hover:hover:border-primary/40",
										"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
										"motion-safe:can-hover:hover:-translate-y-1 motion-safe:can-hover:hover:scale-[1.02]",
										"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
										"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg",
										isActive && "border-primary/40",
									)}
								>
									{/* Images bento grid */}
									{displayImages.length > 0 ? (
										<CollectionImagesGrid
											images={displayImages}
											collectionName={collection.label}
											variant="compact"
										/>
									) : (
										<div className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden rounded-t-xl">
											<Gem className="text-muted-foreground/40 size-6" aria-hidden="true" />
										</div>
									)}

									{/* Centered title + description with decorative line */}
									<div className="px-3 pb-3 text-center">
										<div
											className={cn(
												"mx-auto mb-2 h-px w-10",
												"via-primary/40 bg-linear-to-r from-transparent to-transparent",
												"origin-center transition-[transform,opacity] duration-300",
												"scale-x-[0.67]",
												"motion-reduce:scale-x-100",
												"motion-safe:can-hover:group-hover/card:scale-x-100 motion-safe:can-hover:group-hover/card:via-primary/60",
											)}
											aria-hidden="true"
										/>
										<span
											className={cn(
												"line-clamp-1 text-sm",
												isActive ? "text-foreground font-medium" : "text-foreground",
											)}
										>
											{collection.label}
										</span>
										{collection.description && (
											<p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
												{collection.description}
											</p>
										)}
									</div>
								</Link>
							</NavigationMenuLink>
						</div>
					);
				})}
			</div>
		</div>
	);
}
